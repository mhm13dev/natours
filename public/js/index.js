/* eslint-disable */
import '@babel/polyfill';
import { login, logout } from './loginAndOut';
import { updateSettings } from './updateSettings';
import { displayMap } from './mapbox';
import { getCheckoutSession } from './booking';
import { showAlert } from './alerts';

const mapBox = document.getElementById('map');
const loginForm = document.querySelector('.form--login');
const userDataForm = document.querySelector('.form-user-data');
const userPasswordForm = document.querySelector('.form-user-password');
const bookingBtn = document.getElementById('booking-btn');

if (mapBox) {
  const locations = JSON.parse(mapBox.dataset.locations);
  displayMap(locations);
}

if (loginForm) {
  loginForm.addEventListener('submit', e => {
    e.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    login(email, password);
  });
}

const logoutBtn = document.querySelector('.nav__el--logout');
if (logoutBtn) {
  logoutBtn.addEventListener('click', logout);
}

if (userDataForm) {
  userDataForm.addEventListener('submit', async e => {
    document.querySelector('.btn--user-data').textContent = 'Updating...';
    e.preventDefault();
    const name = document.getElementById('name').value;
    const email = document.getElementById('email').value;
    const photo = document.getElementById('photo').files[0];

    const form = new FormData();
    form.append('name', name);
    form.append('email', email);
    form.append('photo', photo);
    await updateSettings(form, 'data');
    document.querySelector('.btn--user-data').textContent = 'Save Settings';
  });
}
if (userPasswordForm) {
  userPasswordForm.addEventListener('submit', async e => {
    document.querySelector('.btn--user-password').textContent = 'Updating...';
    e.preventDefault();
    const passwordCurrent = document.getElementById('password-current').value;
    const password = document.getElementById('password').value;
    const passwordConfirm = document.getElementById('password-confirm').value;

    await updateSettings(
      { passwordCurrent, password, passwordConfirm },
      'password'
    );
    document.querySelector('.btn--user-password').textContent = 'Save Password';
  });
}

if (bookingBtn)
  bookingBtn.addEventListener('click', async function(e) {
    const { tourId } = e.target.dataset;
    await getCheckoutSession(tourId);
  });

const alertMessage = document.querySelector('body').dataset.alert;
if (alert) {
  showAlert('success', alertMessage, 15);
}
