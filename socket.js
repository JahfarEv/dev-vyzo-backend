const socketIo = require('socket.io');
const jwt = require('jsonwebtoken')
const validate = require('./helpers/validate')
const utility = require('./helpers/utility');
const slotModel = require('./models/slot')
const doctorModel = require('./models/doctor')
const moment = require('moment-timezone');
moment.tz.setDefault("Asia/Kolkata");


function setupSocketIO(server) {
  const io = socketIo(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  });

  const authenticate = async (socket, next) => {
    const { token, userType } = socket.handshake.auth
    if (userType !== 'doctor') {
      socket.user = { userType: 'customer' }
      return next();
    }

    if (!token) {
      return next(new Error('Authentication error: Missing token or user type'))
    }

    const tokenSecret = process.env.JWT_SECRET_DOCTOR
    if (!tokenSecret) {
      return next(new Error('Authentication error: Invalid user type'));
    }
console.log(tokenSecret);

    try {
      const verified = jwt.verify(token, tokenSecret);

      if (!validate.isValidObjectId(verified.doctorId)) {
        throw new Error('Invalid token');
      }
console.log(verified.doctorId);

      socket.user = {
        userType,
        id: verified.doctorId
      }
      next();
    } catch (error) {
      next(new Error(`Authentication error: ${error.message}`))
    }
  };

  io.use(authenticate);

  global.onlineUsers = new Map();

  io.on("connection", (socket) => {
    console.log('connectin established', socket.id)
    global.chatSocket = socket;
    onlineUsers.set(socket.user, socket.id)

    if (socket.user.userType === 'doctor') {
      const currentData = {}
      utility.tokensOfDoctor(socket.user.id).then((slots) => {
        currentData.slots = slots
        io.to(socket.id).emit('receiveUpdate', currentData)
      })
    }

    // For customer
    socket.on('joinRoom', async (doctorId) => {
      try {
        if (!doctorId) return null
        const roomName = `${doctorId}-${moment().format('DD/MM/YYYY')}`
        socket.join(roomName)
        console.log(`${socket.id} joined in the room of ${roomName}`)

        const currentData = {}
        currentData.doctorStatus = await utility.doctorPresenceStatus(doctorId)
        currentData.currentToken = await utility.currentToken(doctorId)
        currentData.upcomingSlots = await utility.upcomingTokens(doctorId)
        io.to(socket.id).emit('receiveUpdate', currentData);
      } catch (error) {
        console.log(error)
      }
    })

    // For Doctor
    socket.on('updatePresence', async (data) => {
      if (socket.user.userType !== 'doctor') return null
      if (!data?.action) return null
      const doctorId = socket.user.id
      console.log(doctorId);
      
      try {
        switch (data.action) {
          case 'in':
            await utility.doctorIn(doctorId)
            await utility.feedTokens(doctorId)
            break;

          case 'out':
            
            await utility.doctorClockOut(doctorId)
            break;

          case 'take break':
            await utility.takeBreak({
              doctorId,
              estimatedTime: data.estimatedTime,
              reason: data.reason
            })
            break;

          case 'return':
            await utility.returnToWork(doctorId)
            break;
          default:
            break;
        }

     

        const updatedData = {}
        updatedData.doctorStatus = await utility.doctorPresenceStatus(doctorId)
        updatedData.currentToken = await utility.currentToken(doctorId)
        updatedData.upcomingSlots = await utility.upcomingTokens(doctorId)
        const roomName = `${doctorId}-${moment().format('DD/MM/YYYY')}`
        io.to(roomName).emit('receiveUpdate', updatedData);

        delete updatedData.upcomingSlots

        updatedData.slots = await utility.tokensOfDoctor(doctorId)
        io.to(socket.id).emit('receiveUpdate', updatedData);
      } catch (error) {
        console.log(error)
      }
    })

    socket.on('arriveFile', async (tokenNo) => {
      if (!tokenNo) return null
      if (socket.user.userType !== 'doctor') return null
      try {
        const doctorId = socket.user.id
        const tokenData = await slotModel.findOneAndUpdate(
          {
            date: moment().format('DD/MM/YYYY'),
            doctor: doctorId,
            tokenNo,
            startingTime: {
              $exists: false
            }
          },
          {
            fileArrive: true
          },
          {
            new: false
          }
        )

        if (!tokenData || tokenData.fileArrive) return null

        const updatedData = {}
        updatedData.currentToken = await utility.currentToken(doctorId)
        updatedData.upcomingSlots = await utility.upcomingTokens(doctorId)
        const roomName = `${doctorId}-${moment().format('DD/MM/YYYY')}`
        io.to(roomName).emit('receiveUpdate', updatedData);

        delete updatedData.upcomingSlots

        updatedData.slots = await utility.tokensOfDoctor(doctorId)
        io.to(socket.id).emit('receiveUpdate', updatedData);
      } catch (error) {
        console.log(error)
      }
    })

    
    socket.on('takeFile', async (tokenNo) => {
      if (!tokenNo) return null
      if (socket.user.userType !== 'doctor') return null
      try {
        const doctorId = socket.user.id
        const now = moment().format('hh:mm:ss')
        const tokenData = await slotModel.findOneAndUpdate(
          {
            date: moment().format('DD/MM/YYYY'),
            doctor: doctorId,
            tokenNo,
            fileArrive: true
          },
          {
            startingTime: now
          },
          {
            new: false
          }
        )

        if (!tokenData || tokenData.startingTime) return null
        await slotModel.updateMany(
          {
            date: moment().format('DD/MM/YYYY'),
            doctor: doctorId,
            tokenNo: { $ne: tokenNo },
            fileArrive: true,
            startingTime: { $exists: true, $ne: '' },
          },
          {
            endingTime: now
          }
        )

        const updatedData = {}
        updatedData.currentToken = await utility.currentToken(doctorId)
        updatedData.upcomingSlots = await utility.upcomingTokens(doctorId)
        const roomName = `${doctorId}-${moment().format('DD/MM/YYYY')}`
        io.to(roomName).emit('receiveUpdate', updatedData);

        delete updatedData.upcomingSlots

        updatedData.slots = await utility.tokensOfDoctor(doctorId)
        io.to(socket.id).emit('receiveUpdate', updatedData);
      } catch (error) {
        console.log(error)
      }
    })


    socket.on('changeOrderToken', async (data) => {
      try {
        if (!data.tokenNo || !data.newOrder) return null
        if (socket.user.userType !== 'doctor') return null
        const doctorId = socket.user.id

        await utility.changeOrder(doctorId, data.tokenNo, data.newOrder)
        const updatedData = {}
        updatedData.upcomingSlots = await utility.upcomingTokens(doctorId)
        updatedData.currentToken = await utility.currentToken(doctorId)
        const roomName = `${doctorId}-${moment().format('DD/MM/YYYY')}`
        io.to(roomName).emit('receiveUpdate', updatedData);

        delete updatedData.upcomingSlots

        updatedData.slots = await utility.tokensOfDoctor(doctorId)
        io.to(socket.id).emit('receiveUpdate', updatedData);
      } catch (error) {
        console.log(error, 'error in socket change order')
      }
    })



    socket.on('disconnect', () => {
      onlineUsers.delete(socket.user.id)
      console.log('Client disconnected:', socket.id)
    });
  });
}

module.exports = { setupSocketIO };


// const socketIo = require('socket.io');
// const jwt = require('jsonwebtoken');
// const validate = require('./helpers/validate');
// const utility = require('./helpers/utility');
// const slotModel = require('./models/slot');
// const moment = require('moment-timezone');
// moment.tz.setDefault("Asia/Kolkata");

// function setupSocketIO(server) {
//   const io = socketIo(server, {
//     cors: {
//       origin: "*",
//       methods: ["GET", "POST"]
//     }
//   });

//   const authenticate = async (socket, next) => {
//     const { token, userType } = socket.handshake.auth;
//     if (userType !== 'doctor') {
//       socket.user = { userType: 'customer' };
//       return next();
//     }

//     if (!token) {
//       return next(new Error('Authentication error: Missing token or user type'));
//     }

//     const tokenSecret = process.env.JWT_SECRET_DOCTOR;
//     if (!tokenSecret) {
//       return next(new Error('Authentication error: Invalid user type'));
//     }

//     try {
//       const verified = jwt.verify(token, tokenSecret);
//       if (!validate.isValidObjectId(verified.doctorId)) {
//         throw new Error('Invalid token');
//       }

//       socket.user = { userType, id: verified.doctorId };
//       next();
//     } catch (error) {
//       next(new Error(`Authentication error: ${error.message}`));
//     }
//   };

//   io.use(authenticate);

//   global.onlineUsers = new Map();

//   io.on("connection", (socket) => {
//     console.log('Connection established:', socket.id);
//     global.chatSocket = socket;
//     onlineUsers.set(socket.user.id, socket.id);

//     // Fetch and emit data for the doctor when they connect
//     if (socket.user.userType === 'doctor') {
//       utility.tokensOfDoctor(socket.user.id).then(slots => {
//         io.to(socket.id).emit('receiveUpdate', { slots });
//       });
//     }

//     // For customer to join a room
//     socket.on('joinRoom', async (doctorId) => {
//       if (!doctorId) return;

//       const roomName = `${doctorId}-${moment().format('DD/MM/YYYY')}`;

//       // Prevent joining the same room again
//       if (!socket.rooms.has(roomName)) {
//         socket.join(roomName);
//         console.log(`${socket.id} joined room: ${roomName}`);

//         const currentData = {
//           doctorStatus: await utility.doctorPresenceStatus(doctorId),
//           currentToken: await utility.currentToken(doctorId),
//           upcomingSlots: await utility.upcomingTokens(doctorId)
//         };
//         io.to(socket.id).emit('receiveUpdate', currentData);
//       }
//     });

//     // For doctor to update presence
//     socket.on('updatePresence', async (data) => {
//       if (socket.user.userType !== 'doctor' || !data?.action) return;

//       const doctorId = socket.user.id;
//       try {
//         switch (data.action) {
//           case 'in':
//             await utility.doctorIn(doctorId);
//             await utility.feedTokens(doctorId);
//             break;
//           case 'out':
//             await utility.doctorClockOut(doctorId);
//             break;
//           case 'take break':
//             await utility.takeBreak({
//               doctorId,
//               estimatedTime: data.estimatedTime,
//               reason: data.reason
//             });
//             break;
//           case 'return':
//             await utility.returnToWork(doctorId);
//             break;
//           default:
//             return; // Exit if action is unknown
//         }

//         const updatedData = {
//           doctorStatus: await utility.doctorPresenceStatus(doctorId),
//           currentToken: await utility.currentToken(doctorId),
//           slots: await utility.tokensOfDoctor(doctorId)
//         };

//         const roomName = `${doctorId}-${moment().format('DD/MM/YYYY')}`;
//         io.to(roomName).emit('receiveUpdate', updatedData);
//         io.to(socket.id).emit('receiveUpdate', updatedData);

//       } catch (error) {
//         console.error('Error updating presence:', error);
//       }
//     });

//     // Handle file arrival
//     socket.on('arriveFile', async (tokenNo) => {
//       if (!tokenNo || socket.user.userType !== 'doctor') return;

//       const doctorId = socket.user.id;
//       try {
//         const tokenData = await slotModel.findOneAndUpdate(
//           {
//             date: moment().format('DD/MM/YYYY'),
//             doctor: doctorId,
//             tokenNo,
//             startingTime: { $exists: false }
//           },
//           { fileArrive: true },
//           { new: false }
//         );

//         if (!tokenData || tokenData.fileArrive) return;

//         const updatedData = {
//           currentToken: await utility.currentToken(doctorId),
//           upcomingSlots: await utility.upcomingTokens(doctorId),
//           slots: await utility.tokensOfDoctor(doctorId)
//         };

//         const roomName = `${doctorId}-${moment().format('DD/MM/YYYY')}`;
//         io.to(roomName).emit('receiveUpdate', updatedData);
//         io.to(socket.id).emit('receiveUpdate', updatedData);
//       } catch (error) {
//         console.error('Error processing file arrival:', error);
//       }
//     });

//     // Handle taking file
//     socket.on('takeFile', async (tokenNo) => {
//       if (!tokenNo || socket.user.userType !== 'doctor') return;

//       const doctorId = socket.user.id;
//       const now = moment().format('hh:mm:ss');
//       try {
//         const tokenData = await slotModel.findOneAndUpdate(
//           {
//             date: moment().format('DD/MM/YYYY'),
//             doctor: doctorId,
//             tokenNo,
//             fileArrive: true
//           },
//           { startingTime: now },
//           { new: false }
//         );

//         if (!tokenData || tokenData.startingTime) return;

//         await slotModel.updateMany(
//           {
//             date: moment().format('DD/MM/YYYY'),
//             doctor: doctorId,
//             tokenNo: { $ne: tokenNo },
//             fileArrive: true,
//             startingTime: { $exists: true, $ne: '' },
//           },
//           { endingTime: now }
//         );

//         const updatedData = {
//           currentToken: await utility.currentToken(doctorId),
//           upcomingSlots: await utility.upcomingTokens(doctorId),
//           slots: await utility.tokensOfDoctor(doctorId)
//         };

//         const roomName = `${doctorId}-${moment().format('DD/MM/YYYY')}`;
//         io.to(roomName).emit('receiveUpdate', updatedData);
//         io.to(socket.id).emit('receiveUpdate', updatedData);
//       } catch (error) {
//         console.error('Error taking file:', error);
//       }
//     });

//     // Handle changing order of tokens
//     socket.on('changeOrderToken', async (data) => {
//       if (!data.tokenNo || !data.newOrder || socket.user.userType !== 'doctor') return;

//       const doctorId = socket.user.id;
//       try {
//         await utility.changeOrder(doctorId, data.tokenNo, data.newOrder);

//         const updatedData = {
//           upcomingSlots: await utility.upcomingTokens(doctorId),
//           currentToken: await utility.currentToken(doctorId),
//           slots: await utility.tokensOfDoctor(doctorId)
//         };

//         const roomName = `${doctorId}-${moment().format('DD/MM/YYYY')}`;
//         io.to(roomName).emit('receiveUpdate', updatedData);
//         io.to(socket.id).emit('receiveUpdate', updatedData);
//       } catch (error) {
//         console.error('Error changing order of token:', error);
//       }
//     });

//     // Handle disconnection
//     socket.on('disconnect', () => {
//       onlineUsers.delete(socket.user.id);
//       console.log('Client disconnected:', socket.id);
//     });
//   });
// }

// module.exports = { setupSocketIO };




//chat gpt code 

// const socketIo = require('socket.io');
// const jwt = require('jsonwebtoken');
// const validate = require('./helpers/validate');
// const utility = require('./helpers/utility');
// const slotModel = require('./models/slot');
// const doctorModel = require('./models/doctor');
// const moment = require('moment-timezone');
// moment.tz.setDefault('Asia/Kolkata');

// function setupSocketIO(server) {
//   const io = socketIo(server, {
//     cors: {
//       origin: '*',
//       methods: ['GET', 'POST'],
//     },
//   });

//   const authenticate = async (socket, next) => {
//     const { token, userType } = socket.handshake.auth;
//     if (userType !== 'doctor') {
//       socket.user = { userType: 'customer' };
//       return next();
//     }

//     if (!token) {
//       return next(new Error('Authentication error: Missing token or user type'));
//     }

//     const tokenSecret = process.env.JWT_SECRET_DOCTOR;
//     if (!tokenSecret) {
//       return next(new Error('Authentication error: Invalid user type'));
//     }

//     try {
//       const verified = jwt.verify(token, tokenSecret);

//       if (!validate.isValidObjectId(verified.doctorId)) {
//         throw new Error('Invalid token');
//       }

//       socket.user = {
//         userType,
//         id: verified.doctorId,
//       };
//       next();
//     } catch (error) {
//       next(new Error(`Authentication error: ${error.message}`));
//     }
//   };

//   io.use(authenticate);

//   // Use doctor IDs as keys in the onlineUsers map
//   global.onlineUsers = new Map();

//   io.on('connection', (socket) => {
//     console.log('Connection established', socket.id);
//     global.chatSocket = socket;
//     onlineUsers.set(socket.user.id, socket.id); // Fixed key usage

//     if (socket.user.userType === 'doctor') {
//       const currentData = {};
//       utility.tokensOfDoctor(socket.user.id).then((slots) => {
//         currentData.slots = slots;
//         io.to(socket.id).emit('receiveUpdate', currentData);
//       });
//     }

//     // For customer
//     socket.on('joinRoom', async (doctorId) => {
//       try {
//         if (!doctorId) return;
//         const roomName = `${doctorId}-${moment().format('DD/MM/YYYY')}`;
//         socket.join(roomName);
//         console.log(`${socket.id} joined the room ${roomName}`);

//         const currentData = {};
//         currentData.doctorStatus = await utility.doctorPresenceStatus(doctorId);
//         currentData.currentToken = await utility.currentToken(doctorId);
//         currentData.upcomingSlots = await utility.upcomingTokens(doctorId);
//         io.to(socket.id).emit('receiveUpdate', currentData);
//       } catch (error) {
//         console.log(error);
//       }
//     });

//     // For Doctor
//     socket.on('updatePresence', async (data) => {
//       if (socket.user.userType !== 'doctor') return;
//       if (!data?.action) return;
//       const doctorId = socket.user.id;
//       console.log('Doctor ID:', doctorId);

//       try {
//         switch (data.action) {
//           case 'in':
//             await utility.doctorIn(doctorId);
//             // Call feedTokens only if tokens don't exist
//             await utility.feedTokens(doctorId);
//             break;

//           case 'out':
//             await utility.doctorClockOut(doctorId);
//             break;

//           case 'take break':
//             await utility.takeBreak({
//               doctorId,
//               estimatedTime: data.estimatedTime,
//               reason: data.reason,
//             });
//             break;

//           case 'return':
//             await utility.returnToWork(doctorId);
//             break;
//           default:
//             break;
//         }

//         const updatedData = {};
//         updatedData.doctorStatus = await utility.doctorPresenceStatus(doctorId);
//         updatedData.currentToken = await utility.currentToken(doctorId);
//         updatedData.upcomingSlots = await utility.upcomingTokens(doctorId);
//         const roomName = `${doctorId}-${moment().format('DD/MM/YYYY')}`;
//         io.to(roomName).emit('receiveUpdate', updatedData);

//         delete updatedData.upcomingSlots;

//         updatedData.slots = await utility.tokensOfDoctor(doctorId);
//         io.to(socket.id).emit('receiveUpdate', updatedData);
//       } catch (error) {
//         console.log(error);
//       }
//     });

//     socket.on('arriveFile', async (tokenNo) => {
//       if (!tokenNo) return;
//       if (socket.user.userType !== 'doctor') return;
//       try {
//         const doctorId = socket.user.id;
//         const tokenData = await slotModel.findOneAndUpdate(
//           {
//             date: moment().format('DD/MM/YYYY'),
//             doctor: doctorId,
//             tokenNo,
//             startingTime: {
//               $exists: false,
//             },
//           },
//           {
//             fileArrive: true,
//           },
//           {
//             new: false,
//           }
//         );

//         if (!tokenData || tokenData.fileArrive) return;

//         const updatedData = {};
//         updatedData.currentToken = await utility.currentToken(doctorId);
//         updatedData.upcomingSlots = await utility.upcomingTokens(doctorId);
//         const roomName = `${doctorId}-${moment().format('DD/MM/YYYY')}`;
//         io.to(roomName).emit('receiveUpdate', updatedData);

//         delete updatedData.upcomingSlots;

//         updatedData.slots = await utility.tokensOfDoctor(doctorId);
//         io.to(socket.id).emit('receiveUpdate', updatedData);
//       } catch (error) {
//         console.log(error);
//       }
//     });

//     socket.on('takeFile', async (tokenNo) => {
//       if (!tokenNo) return;
//       if (socket.user.userType !== 'doctor') return;
//       try {
//         const doctorId = socket.user.id;
//         const now = moment().format('hh:mm:ss');
//         const tokenData = await slotModel.findOneAndUpdate(
//           {
//             date: moment().format('DD/MM/YYYY'),
//             doctor: doctorId,
//             tokenNo,
//             fileArrive: true,
//           },
//           {
//             startingTime: now,
//           },
//           {
//             new: false,
//           }
//         );

//         if (!tokenData || tokenData.startingTime) return;
//         await slotModel.updateMany(
//           {
//             date: moment().format('DD/MM/YYYY'),
//             doctor: doctorId,
//             tokenNo: { $ne: tokenNo },
//             fileArrive: true,
//             startingTime: { $exists: true, $ne: '' },
//           },
//           {
//             endingTime: now,
//           }
//         );

//         const updatedData = {};
//         updatedData.currentToken = await utility.currentToken(doctorId);
//         updatedData.upcomingSlots = await utility.upcomingTokens(doctorId);
//         const roomName = `${doctorId}-${moment().format('DD/MM/YYYY')}`;
//         io.to(roomName).emit('receiveUpdate', updatedData);

//         delete updatedData.upcomingSlots;

//         updatedData.slots = await utility.tokensOfDoctor(doctorId);
//         io.to(socket.id).emit('receiveUpdate', updatedData);
//       } catch (error) {
//         console.log(error);
//       }
//     });

//     socket.on('changeOrderToken', async (data) => {
//       try {
//         if (!data.tokenNo || !data.newOrder) return;
//         if (socket.user.userType !== 'doctor') return;
//         const doctorId = socket.user.id;

//         await utility.changeOrder(doctorId, data.tokenNo, data.newOrder);
//         const updatedData = {};
//         updatedData.upcomingSlots = await utility.upcomingTokens(doctorId);
//         updatedData.currentToken = await utility.currentToken(doctorId);
//         const roomName = `${doctorId}-${moment().format('DD/MM/YYYY')}`;
//         io.to(roomName).emit('receiveUpdate', updatedData);

//         delete updatedData.upcomingSlots;

//         updatedData.slots = await utility.tokensOfDoctor(doctorId);
//         io.to(socket.id).emit('receiveUpdate', updatedData);
//       } catch (error) {
//         console.log(error, 'Error in socket change order');
//       }
//     });

//     socket.on('disconnect', () => {
//       onlineUsers.delete(socket.user.id); // Fixed deletion
//       console.log('Client disconnected:', socket.id);
//     });
//   });
// }

// module.exports = { setupSocketIO };
