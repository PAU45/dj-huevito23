import axios from 'axios';

const API_KEY = process.env.REACT_APP_ADMIN_API_KEY || '';

const api = axios.create({
  baseURL: '/',
  headers: API_KEY ? { 'x-api-key': API_KEY } : {}
});

export default api;
