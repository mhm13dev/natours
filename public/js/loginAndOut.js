import axios from 'axios';
import { showAlert } from './alerts';

export const login = async function(email, password) {
  try {
    showAlert('success', 'Processing...');
    const res = await axios({
      method: 'POST',
      url: '/api/v1/users/login',
      data: {
        email,
        password
      }
    });

    if (res.data.status === 'success') {
      showAlert('success', 'Logged in Successfully!');
      window.setTimeout(() => {
        location.assign('/');
      }, 1500);
    }
  } catch (err) {
    showAlert('error', err.response.data.message);
  }
};

export const logout = async () => {
  try {
    showAlert('error', 'Processing...');

    const res = await axios({
      method: 'GET',
      url: '/api/v1/users/logout'
    });

    if (res.data.status === 'success') {
      showAlert('error', 'Logged out Successfully!');
      window.setTimeout(() => {
        if (location.pathname === '/me') {
          location.assign('/');
        } else {
          location.reload(true);
        }
      }, 1500);
    }
  } catch (err) {
    showAlert('error', err.response.data.message);
  }
};
