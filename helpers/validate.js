const mongoose = require('mongoose')


class Validate {

  static isValidObjectId(id) {
    return mongoose.Types.ObjectId.isValid(id);
  };

  static validateInteger(value) {
    if (Number.isInteger(value)) {
      return value;
    }
    return null;
  }

  static validateLimitAndOffset(req) {
    let limit = parseInt(req.query.limit);
    let offset = parseInt(req.query.offset);
    const DEFAULT_LIMIT = 10
    const DEFAULT_OFFSET = 0
    // Validate and set default values
    limit = (isNaN(limit) || limit <= 0) ? DEFAULT_LIMIT : limit;
    offset = isNaN(offset) || offset < 0 ? DEFAULT_OFFSET : offset;
    return { limit, offset }
  }

  static validateStartTimeAndEndTime(startTime, endTime) {
    if (!this.validateTimeFormat(startTime) || !this.validateTimeFormat(endTime)) {
      return []
    }
    // time should be in utility format: '10:30' '12:40'
    const [startHour, startMinute] = startTime.split(":").map(Number);
    const [endHour, endMinute] = endTime.split(":").map(Number);
    if (startHour > endHour || (startHour === endHour && startMinute >= endMinute)) {
      return []
    }
    return [startTime, endTime]
  }

  static validateTimeFormat(time) {
    if (!time) return null
    const timeRegex = /^(?:2[0-3]|[01][0-9]):[0-5][0-9]$/;
    if (!timeRegex.test(time)) {
      return null;
    }
    return time
  }

}

module.exports = Validate