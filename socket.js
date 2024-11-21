
const socketIo = require("socket.io");
const jwt = require("jsonwebtoken");
const validate = require("./helpers/validate");
const utility = require("./helpers/utility");
const slotModel = require("./models/slot");
const doctorModel = require("./models/doctor");
const moment = require("moment-timezone");
moment.tz.setDefault("Asia/Kolkata");

function setupSocketIO(server) {
  const io = socketIo(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
  });

  const authenticate = async (socket, next) => {
    const { token, userType } = socket.handshake.auth;
    if (userType !== "doctor") {
      socket.user = { userType: "customer" };
      return next();
    }

    if (!token) {
      return next(
        new Error("Authentication error: Missing token or user type")
      );
    }

    const tokenSecret = process.env.JWT_SECRET_DOCTOR;
    if (!tokenSecret) {
      return next(new Error("Authentication error: Invalid user type"));
    }

    try {
      const verified = jwt.verify(token, tokenSecret);
      if (!validate.isValidObjectId(verified.doctorId)) {
        throw new Error("Invalid token");
      }

      socket.user = {
        userType,
        id: verified.doctorId,
      };
      next();
    } catch (error) {
      next(new Error(`Authentication error: ${error.message}`));
    }
  };

  io.use(authenticate);

  global.onlineUsers = new Map();

  io.on("connection", (socket) => {
    console.log("connection established", socket.id);
    global.chatSocket = socket;
    onlineUsers.set(socket.user, socket.id);

    const emitUpdateWithTimestamp = async (socket, doctorId) => {
      const updatedData = {};
      updatedData.doctorStatus = await utility.doctorPresenceStatus(doctorId);
      updatedData.currentToken = await utility.currentToken(doctorId);
      updatedData.upcomingSlots = await utility.upcomingTokens(doctorId);
      updatedData.slots = await utility.tokensOfDoctor(doctorId);
      updatedData.lastUpdated = moment().format("hh:mm:ss"); // Capture the last updated time

      const roomName = `${doctorId}-${moment().format("DD/MM/YYYY")}`;
      io.to(roomName).emit("receiveUpdate", updatedData);
      io.to(socket.id).emit("receiveUpdate", updatedData);
    };

    if (socket.user.userType === "doctor") {
      const currentData = {};
      utility.tokensOfDoctor(socket.user.id).then((slots) => {
        currentData.slots = slots;
        currentData.lastUpdated = moment().format("hh:mm:ss"); // Capture initial timestamp
        io.to(socket.id).emit("receiveUpdate", currentData);
      });
    }

    // For customer
    socket.on("joinRoom", async (doctorId) => {
      try {
        if (!doctorId) return null;
        const roomName = `${doctorId}-${moment().format("DD/MM/YYYY")}`;
        socket.join(roomName);
        console.log(`${socket.id} joined in the room of ${roomName}`);

        emitUpdateWithTimestamp(socket, doctorId);
      } catch (error) {
        console.log(error);
      }
    });

    // For Doctor
    socket.on("updatePresence", async (data) => {
      if (socket.user.userType !== "doctor") return null;
      if (!data?.action) return null;
      const doctorId = socket.user.id;

      try {
        switch (data.action) {
          case "in":
            await utility.doctorIn(doctorId);
            await utility.feedTokens(doctorId);
            break;

          case "out":
            await utility.doctorClockOut(doctorId);
            break;

          case "take break":
            await utility.takeBreak({
              doctorId,
              estimatedTime: data.estimatedTime,
              reason: data.reason,
            });
            break;

          case "return":
            await utility.returnToWork(doctorId);
            break;
          default:
            break;
        }

        emitUpdateWithTimestamp(socket, doctorId);
      } catch (error) {
        console.log(error);
      }
    });

    socket.on("arriveFile", async (tokenNo) => {
      if (!tokenNo) return null;
      if (socket.user.userType !== "doctor") return null;
      try {
        const doctorId = socket.user.id;
        const tokenData = await slotModel.findOneAndUpdate(
          {
            date: moment().format("DD/MM/YYYY"),
            doctor: doctorId,
            tokenNo,
            startingTime: {
              $exists: false,
            },
          },
          {
            fileArrive: true,
          },
          {
            new: false,
          }
        );

        if (!tokenData || tokenData.fileArrive) return null;

        emitUpdateWithTimestamp(socket, doctorId);
      } catch (error) {
        console.log(error);
      }
    });


    // socket.on("tokenComplete", async (tokenNo) => {
    //   if (!tokenNo) return null;
    //   if (socket.user.userType !== "doctor") return null;
    //   try {
    //     const doctorId = socket.user.id;
    //     const tokenData = await slotModel.findOneAndUpdate(
    //       {
    //         date: moment().format("DD/MM/YYYY"),
    //         doctor: doctorId,
    //         tokenNo,
    //       },
    //       {
    //         completed: true,
    //         endingTime: moment().format("hh:mm:ss"), // Record ending time

            
    //       },
    //       {
    //         new: false,
    //       }
    //     );


    //     emitUpdateWithTimestamp(socket, doctorId);
    //   } catch (error) {
    //     console.log(error);
    //   }
    // });


    //test completed

    socket.on("tokenComplete", async (tokenNo) => {
      if (!tokenNo) return null;
      if (socket.user.userType !== "doctor") return null;
    
      try {
        const doctorId = socket.user.id;
    
        // Capture the current timestamp at the event trigger
        const currentTime = moment().format("hh:mm:ss");
    
        // Update only the specific token with the captured timestamp
        const tokenData = await slotModel.findOneAndUpdate(
          {
            date: moment().format("DD/MM/YYYY"), // Match today's date
            doctor: doctorId,                   // Match doctor
            tokenNo,                            // Match token number
          },
          {
            $set: {
              completed: true,
              endingTime: currentTime, // Use the captured timestamp
            },
          },
          { new: false } // Return the updated document
        );
    
        if (!tokenData) {
          console.log(`Token not found for token number: ${tokenNo}`);
          return;
        }
    
        // Emit updates specific to the doctor
        emitUpdateWithTimestamp(socket, doctorId);
    
        console.log(`Token ${tokenNo} marked as completed with ending time: ${currentTime}`);
      } catch (error) {
        console.error("Error updating token:", error);
      }
    });
    


    //update consultation time

    socket.on("updateConsultationTime", async (additionalTime) => {
      if (socket.user.userType !== "doctor") return null;

      try {
        const doctorId = socket.user.id;

        // Call the currentToken method to update consultation time
        const updatedTokenData = await utility.currentToken(
          doctorId,
          additionalTime
        );

        if (!updatedTokenData) return null;

        // Emit an update with the new consultation time
        emitUpdateWithTimestamp(socket, doctorId);
      } catch (error) {
        console.log(error);
      }
    });

    socket.on("takeFile", async (tokenNo) => {
      if (!tokenNo) return null;
      if (socket.user.userType !== "doctor") return null;
      try {
        const doctorId = socket.user.id;
        const now = moment().format("hh:mm:ss");
        const tokenData = await slotModel.findOneAndUpdate(
          {
            date: moment().format("DD/MM/YYYY"),
            doctor: doctorId,
            tokenNo,
            fileArrive: true,
            completed:false
          },
          {
            startingTime: now,
          },
          {
            new: false,
          }
        );

        if (!tokenData || tokenData.startingTime) return null;
        await slotModel.updateMany(
          {
            date: moment().format("DD/MM/YYYY"),
            doctor: doctorId,
            tokenNo: { $ne: tokenNo },
            fileArrive: true,
            startingTime: { $exists: true, $ne: "" },
          },
          {
            // endingTime: now,
            completed: true,
          }
        );

        emitUpdateWithTimestamp(socket, doctorId);
      } catch (error) {
        console.log(error);
      }
    });

   

    socket.on("changeOrderToken", async (data) => {
      try {
        if (!data.tokenNo || !data.newOrder) return null;
        if (socket.user.userType !== "doctor") return null;
        const doctorId = socket.user.id;

        await utility.changeOrder(doctorId, data.tokenNo, data.newOrder);
        emitUpdateWithTimestamp(socket, doctorId);
      } catch (error) {
        console.log(error, "error in socket change order");
      }
    });

    socket.on("disconnect", () => {
      onlineUsers.delete(socket.user.id);
      console.log("Client disconnected:", socket.id);
    });
  });
}

module.exports = { setupSocketIO };