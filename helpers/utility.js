const crypto = require('crypto')
const bcrypt = require('bcrypt')
const mongoose = require('mongoose')
const doctorPresenceModel = require('../models/doctorPresence')
const slotModel = require('../models/slot')
const doctorModel = require('../models/doctor')
const moment = require('moment-timezone');
moment.tz.setDefault("Asia/Kolkata");
var QRCode = require('qrcode')


class Utility {
  // eslint-disable-next-line default-param-last
  static successRes(message = '', data) {
    return {
      status: 'success',
      message,
      data,
    }
  }

  static errorRes(message, errorStatus = 'error') {
    return { status: errorStatus, message }
  }

  static conflictRes(message, errorStatus = 'conflict') {
    return { status: errorStatus, message }
  }

  static calcTimeDifference(date1, date2) {
    const startTime = new Date(date1)
    const endTime = new Date(date2)
    return endTime.getTime() - startTime.getTime()
  }

  static capitalizeString(str) {
    if (!str) return null
    const trimmedStr = str.trim()
    const normalizedStr = trimmedStr.replace(/\s{2,}/g, ' ')
    const words = normalizedStr.split(' ')
    const capitalizedWords = words.map((word) => {
      const firstLetter = word.charAt(0).toUpperCase()
      const restOfWord = word.slice(1).toLowerCase()
      return firstLetter + restOfWord
    })
    return capitalizedWords.join(' ')
  }

  static saltRounds() {
    return Math.round(Math.random() * 10)
  }

  static hashPassword(password) {
    const saltRounds = this.saltRounds()
    return bcrypt.hashSync(password, saltRounds)
  }

  static generateUniqueIdAndKey() {
    const generateRandomString = (length, characters) => {
      return Array.from(crypto.randomFillSync(new Uint8Array(length)))
        .map((n) => characters[n % characters.length])
        .join('');
    };

    const idLetters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const idNumbers = '0123456789';

    const keyCharacters = '0123456789';

    const idLetterPart = generateRandomString(4, idLetters);
    const idNumberPart = generateRandomString(2, idNumbers);
    const uniqueId = `${idLetterPart}${idNumberPart}`;

    const accessKey = generateRandomString(7, keyCharacters);

    return { uniqueId, accessKey };
  }

  // static async upcomingTokens(doctorId) {
  //   try {
  //     const doctor = await doctorModel.findById(doctorId)

  //     const presenceData = await doctorPresenceModel.findOne({
  //       date: moment().format('DD/MM/YYYY'),
  //       doctor: doctorId,
  //     })

  //     const slots = await slotModel.find({
  //       date: moment().format('DD/MM/YYYY'),
  //       doctor: doctorId,
  //       fileArrive: true,
  //       $or: [
  //         {
  //           startingTime: { $exists: false },
  //         },
  //         {
  //           startingTime: { $eq: '' },
  //         },
  //       ]
  //     }).select('tokenNo orderNumber')
  //       .sort('orderNumber')
  //       .lean()

  //     let currentTime

  //     if (!presenceData) {
  //       currentTime = moment.max(moment(), moment(doctor.workingHoursStarting, 'HH:mm'));
  //     } else {
  //       if (presenceData.outTime) { return [] }
  //       const lastBreak = presenceData.breaks[presenceData.breaks.length - 1]

  //       if (lastBreak) {
  //         if (!lastBreak.endTime) {
  //           const breakEndTime = moment(lastBreak.startTime, 'HH:mm:ss').add(lastBreak.estimatedTime, 'minutes');
  //           currentTime = moment.max(moment(), breakEndTime);
  //         } else {
  //           currentTime = moment();
  //         }
  //       } else {
  //         currentTime = moment();
  //       }
  //     }

  //     let accumulatedTime = 0;
  //     const { averageConsultationTime } = doctor

  //     const slotsWithTime = slots.map(token => {
  //       const expectedTime = moment(currentTime).add(accumulatedTime, 'minutes');
  //       accumulatedTime += averageConsultationTime;

  //       return {
  //         ...token,
  //         expectedTime: expectedTime.format('HH:mm')
  //       };
  //     });

  //     return slotsWithTime
  //   } catch (error) {
  //     throw error
  //   }
  // }


  static async upcomingTokens(doctorId) {
    try {
      const doctor = await doctorModel.findById(doctorId);
  
      const presenceData = await doctorPresenceModel.findOne({
        date: moment().format('DD/MM/YYYY'),
        doctor: doctorId,
      });
  
      // Fetch current token to get its expected end time
      const currentToken = await slotModel.findOne({
        date: moment().format('DD/MM/YYYY'),
        doctor: doctorId,
        fileArrive: true,
        startingTime: { $exists: true, $ne: "" },
        $or: [
          { endingTime: { $exists: false } },
          { endingTime: '' },
        ]
      })
      .sort('orderNumber') // Assuming tokens are ordered by orderNumber
      .lean();
  
      // Calculate the current time for determining the start time for upcoming tokens
      let currentTime;
  
      if (!presenceData) {
        currentTime = moment.max(moment(), moment(doctor.workingHoursStarting, 'HH:mm'));
      } else {
        if (presenceData.outTime) { return []; }
        const lastBreak = presenceData.breaks[presenceData.breaks.length - 1];
  
        if (lastBreak && !lastBreak.endTime) {
          const breakEndTime = moment(lastBreak.startTime, 'HH:mm:ss').add(lastBreak.estimatedTime, 'minutes');
          currentTime = moment.max(moment(), breakEndTime);
        } else {
          currentTime = moment();
        }
      }
  
      // Initialize the accumulated time for upcoming tokens
      let accumulatedTime = 0;
  
      // If there is a current token, use its expected end time as the starting point
      if (currentToken) {
        const currentConsultationTime = currentToken.consultationTime || 0; // Get consultation time from current token
        const expectedEndTime = moment(currentTime)
          .add(currentConsultationTime, 'minutes') // Calculate expected end time
          .format('HH:mm'); // Format to HH:mm for further calculations
  
        // Set the current time to the expected end time for upcoming tokens
        currentTime = moment(expectedEndTime, 'HH:mm');
      }
  
      const slots = await slotModel.find({
        date: moment().format('DD/MM/YYYY'),
        doctor: doctorId,
        fileArrive: true,
        $or: [
          { startingTime: { $exists: false } },
          { startingTime: { $eq: '' } },
        ],
      })
      .select('tokenNo orderNumber consultationTime') // Ensure consultationTime is included
      .sort('orderNumber')
      .lean();
  
      // Process each slot to calculate expected times
      const slotsWithTime = slots.map((slot) => {
        const consultationTime = slot.consultationTime || 0; // Get consultation time from the slot
  
        // Calculate expected start time for the current token based on the current time and accumulated consultation time
        const expectedStartTime = moment(currentTime).add(accumulatedTime, 'minutes');
  
        // Calculate expected end time based on the consultation time of the current token
        const expectedEndTime = moment(expectedStartTime).add(consultationTime, 'minutes');
  
        // Update accumulatedTime for the next iteration
        accumulatedTime += consultationTime;
  
        return {
          ...slot,
          expectedTime: expectedStartTime.format('hh:mm A'), // Start time for the token
          expectedEndTime: expectedEndTime.format('hh:mm A'), // End time for the token
        };
      });
  
      return slotsWithTime;
  
    } catch (error) {
      throw error;
    }
  }
  
  

  static async tokensOfDoctor(doctorId) {
    try {
      const slots = await slotModel.find({
        doctor: doctorId,
        date: moment().format('DD/MM/YYYY')
      }).sort('orderNumber')
        .select('tokenNo orderNumber fileArrive startingTime endingTime')
        .lean()

      return slots
    } catch (error) {
      throw error
    }
  }

//   static async currentToken(doctorId) {
//     try {
//       const token = await slotModel.findOne({
//         date: moment().format('DD/MM/YYYY'),
//         doctor: doctorId,
//         startingTime: { $exists: true, $ne: "" },
//         $or: [
//           {
//             endingTime: { $exists: false }
//           },
//           {
//             endingTime: ''
//           },
//         ]
//       }).select('tokenNo consultationTime startingTime').lean()
// console.log(token.tokenNo);

//       if (!token) return null
//       const tokenNo = token.tokenNo
     
//       return tokenNo
      
//     } catch (error) {
//       throw error
//     }
//   }


static async currentToken(doctorId, additionalTime = 0) {
  try {
    // Fetch the current token with consultation time
    const token = await slotModel.findOne({
      date: moment().format('DD/MM/YYYY'),
      doctor: doctorId,
      startingTime: { $exists: true, $ne: "" },
      $or: [
        { endingTime: { $exists: false } },
        { endingTime: '' },
      ]
    }).select('tokenNo consultationTime startingTime').lean();

    if (!token) return null;

    // Log values for debugging
    console.log('Current Consultation Time:', token.consultationTime);
    console.log('Additional Time:', additionalTime);

    // Ensure consultationTime defaults to 0 if not a valid number
    const existingConsultationTime = token.consultationTime || 0;
    const updatedConsultationTime = existingConsultationTime + additionalTime;

    // Log updated consultation time for debugging
    console.log('Updated Consultation Time:', updatedConsultationTime);

    // Update the database with the new consultation time
    await slotModel.updateOne(
      { _id: token._id }, // Find the token by its ID
      { consultationTime: updatedConsultationTime } // Update consultationTime
    );

    // Calculate expected end time based on the updated consultation time
    const expectedEndTime = moment(token.startingTime, 'HH:mm:ss')
      .add(updatedConsultationTime, 'minutes')
      .format('hh:mm A');

    return {
      tokenNo: token.tokenNo,
      consultationTime: updatedConsultationTime,
      expectedEndTime: expectedEndTime
    };
  } catch (error) {
    console.error("Error in currentToken:", error);
    throw error; // Rethrow the error for further handling
  }
}




  static async doctorPresenceStatus(doctorId) {
    try {
      const presenceData = await doctorPresenceModel.findOne({
        date: moment().format('DD/MM/YYYY'),
        doctor: doctorId,
      })

      if (!presenceData) {
        return 'didn\'t reached yet'
      } else if (presenceData.outTime) {
        return 'consultation completed'
      } else if (presenceData.breaks.length) {
        if (!presenceData.breaks[presenceData.breaks.length - 1].endTime) {
          return 'in break'
        } else {
          return 'live'
        }
      } else return 'live'
    } catch (error) {
      throw error
    }
  }

  static async doctorIn(doctorId) {
    try {
      const alreadyExist = await doctorPresenceModel.findOne({
        date: moment().format('DD/MM/YYYY'),
        doctor: doctorId,
      })
      if (alreadyExist) {
        if (alreadyExist.outTime) {
          throw 'cosnultation completed'
        }
        throw 'already in'
      }

      const res = await doctorPresenceModel.insertMany({
        date: moment().format('DD/MM/YYYY'),
        doctor: doctorId,
        inTime: moment().format('hh:mm:ss'),
        isActive:true
      })

      await doctorModel.updateOne({ _id: doctorId }, { tokenStatus: true });
      return res
    } catch (error) {
      throw error
    }
  }

  static async doctorClockOut(doctorId) {
    try {
      const alreadyExist = await doctorPresenceModel.findOne({
        date: moment().format('DD/MM/YYYY'),
        doctor: doctorId,
      })
      if (!alreadyExist) throw 'didn\'t arrive yet'
      if (alreadyExist.outTime) throw 'already clock out'
      if (alreadyExist.breaks.length &&
        alreadyExist.breaks[alreadyExist.breaks.length - 1].endTime) {
        await this.endBreak(doctorId)
      }

      const res = doctorPresenceModel.updateOne(
        {
          date: moment().format('DD/MM/YYYY'),
          doctor: doctorId,
        },
        {
          outTime: moment().format('hh:mm:ss'),
          
        })

        // Update the tokenStatus to false (doctor is not available)
    await doctorModel.updateOne({ _id: doctorId }, { tokenStatus: false });
      return res
    } catch (error) {
      throw error
    }
  }

  static async takeBreak({ doctorId, estimatedTime = 10, reason }) {
    try {
      const alreadyExist = await doctorPresenceModel.findOne({
        date: moment().format('DD/MM/YYYY'),
        doctor: doctorId,
      })
      if (!alreadyExist) throw 'didn\'t arrive yet'
      if (alreadyExist.outTime) throw 'completed consultation'
      if (alreadyExist.breaks.length &&
        !alreadyExist.breaks[alreadyExist.breaks.length - 1].endTime) {
        return 'already in break'
      }

      const res = await doctorPresenceModel.updateOne({
        date: moment().format('DD/MM/YYYY'),
        doctor: doctorId,
      }, {
        $push: {
          breaks: {
            startTime: moment().format('HH:mm:ss'),
            estimatedTime,
            reason: reason ? reason : null
          }
        }
      })
      return res
    } catch (error) {
      throw error
    }
  }

  static async returnToWork(doctorId) {
    try {
      const alreadyExist = await doctorPresenceModel.findOne({
        date: moment().format('DD/MM/YYYY'),
        doctor: doctorId,
      })
      if (!alreadyExist) throw 'didn\'t arrive yet'
      if (alreadyExist.outTime) throw 'completed consultation'
      if (!alreadyExist.breaks.length || alreadyExist.breaks[alreadyExist.breaks.length - 1].endTime) {
        throw 'you are not in break now'
      }

      const res = await this.endBreak(doctorId)
      return res
    } catch (error) {
      throw error
    }
  }

  static async endBreak(doctorId) {
    try {
      const res = await doctorPresenceModel.updateOne(
        {
          date: moment().format('DD/MM/YYYY'),
          doctor: doctorId,
        },
        [
          {
            $set: {
              breaks: {
                $map: {
                  input: {
                    $range: [
                      0,
                      {
                        $size: "$breaks"
                      }
                    ]
                  },
                  as: "index",
                  in: {
                    $cond: [
                      {
                        $eq: [
                          "$$index",
                          {
                            $subtract: [
                              {
                                $size: "$breaks"
                              },
                              1
                            ]
                          }
                        ]
                      },
                      {
                        $mergeObjects: [
                          {
                            $arrayElemAt: [
                              "$breaks",
                              "$$index"
                            ]
                          },
                          {
                            endTime: moment().format('HH:mm:ss')
                          }

                        ]
                      },
                      {
                        $arrayElemAt: [
                          "$breaks",
                          "$$index"
                        ]
                      }
                    ]
                  }
                }
              }
            }
          }
        ])
      return res
    } catch (error) {
      throw error
    }
  }

  static async changeOrder(doctorId, tokenNo, newOrder) {
    try {
      const session = await mongoose.startSession()
      session.startTransaction()

      const tokenToMove = await slotModel.findOne({
        tokenNo,
        date: moment().format('DD/MM/YYYY'),
        doctor: doctorId
      })

      if (!tokenToMove) throw 'token not found'

      const oldOrder = tokenToMove.orderNumber;

      const isMovingDown = newOrder > oldOrder;

      if (isMovingDown) {
        await slotModel.updateMany(
          { orderNumber: { $gt: oldOrder, $lte: newOrder } },
          { $inc: { orderNumber: -1 } },
          { session }
        );
      } else {
        await slotModel.updateMany(
          { orderNumber: { $lt: oldOrder, $gte: newOrder } },
          { $inc: { orderNumber: 1 } },
          { session }
        );
      }

      tokenToMove.orderNumber = newOrder;
      await tokenToMove.save({ session });

      await session.commitTransaction();
      return 'updated'
    } catch (error) {
      throw error
    }
  }

  static async feedTokens(doctorId) {
    try {
      const alreadyExist = await slotModel.findOne({
        doctor: doctorId,
        date: moment().format('DD/MM/YYYY'),
      })

      if (alreadyExist) return null

      const doctor = await doctorModel.findOne({
        _id: doctorId,
        totalTokensPerDay: {
          $exists: true,
          $ne: ''
        }
      }).select('totalTokensPerDay')

      if (!doctor) return null

      const tokens = []

      for (let i = 1; i <= doctor.totalTokensPerDay; i++) {
        tokens.push({
          tokenNo: i,
          doctor: doctor._id,
          date: moment().format('DD/MM/YYYY'),
          orderNumber: i,
        })
      }

      const res = await slotModel.insertMany(tokens)
      return res
    } catch (error) {
      throw error
    }
  }

  static async generateQRImage(doctorId) {
    try {
      const url = await QRCode.toDataURL(JSON.stringify({ doctorId, platform: 'vyzo' }))
      return url
    } catch (error) {
      throw error
    }
  }

}

module.exports = Utility
