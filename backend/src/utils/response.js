// format successful responses
export function sendSuccess(res, { status = 200, data, meta } = {}) {
  return res.status(status).json({ success: true, data, ...(meta && { meta }) });
}