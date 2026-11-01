module.exports = {
  response: (response, status, msg, data = null, pagination = null) => {
    const result = {
      status,
      message: msg,
      data,
    };

    if (pagination) {
      result.pagination = pagination;
    }

    return response.status(status).json(result);
  },
};
