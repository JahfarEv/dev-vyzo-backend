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
        const doctor = await doctorModel.findById(doctorId)

        const presenceData = await doctorPresenceModel.findOne({
            date: moment().format('DD/MM/YYYY'),
            doctor: doctorId,
        })

        const slots = await slotModel.find({
            date: moment().format('DD/MM/YYYY'),
            doctor: doctorId,
            fileArrive: true,
            $or: [
                { startingTime: { $exists: false } },
                { startingTime: { $eq: '' } },
            ]
        }).select('tokenNo orderNumber')
            .sort('orderNumber')
            .lean()

        let currentTime

        if (!presenceData) {
            currentTime = moment.max(moment(), moment(doctor.workingHoursStarting, 'HH:mm'));
        } else {
            if (presenceData.outTime) { return [] }
            const lastBreak = presenceData.breaks[presenceData.breaks.length - 1]

            if (lastBreak) {
                if (!lastBreak.endTime) {
                    const breakEndTime = moment(lastBreak.startTime, 'HH:mm:ss').add(lastBreak.estimatedTime, 'minutes');
                    currentTime = moment.max(moment(), breakEndTime);
                } else {
                    currentTime = moment();
                }
            } else {
                currentTime = moment();
            }
        }

        const { consultationTime } = slotModel
        let accumulatedTime = consultationTime;

        const slotsWithTime = slots.map(token => {
            var expectedTime = moment(currentTime).add(accumulatedTime, 'minutes');
            accumulatedTime += consultationTime;

            return {
                ...token,
                expectedTime: expectedTime.format('hh:mm A') // Change to 12-hour format
            };
        });

        return slotsWithTime
    } catch (error) {
        throw error
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

  static async currentToken(doctorId) {
    try {
      const token = await slotModel.findOne({
        date: moment().format('DD/MM/YYYY'),
        doctor: doctorId,
        startingTime: { $exists: true, $ne: "" },
        $or: [
          {
            endingTime: { $exists: false }
          },
          {
            endingTime: ''
          },
        ]
      }).select('tokenNo').lean()

      if (!token) return null

      return token.tokenNo
    } catch (error) {
      throw error
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
