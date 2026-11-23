const path = '/api/v1/runs';
const target = process.env.AO_API_URL || 'http://127.0.0.1:8000';
const token = process.env.AO_API_ACCESS_TOKEN;

const proxy = { target, changeOrigin: true };
if (token) {
  proxy.headers = { Authorization: 'Bearer ' + token };
}

module.exports = { [path]: proxy, [path + '/**']: proxy };
