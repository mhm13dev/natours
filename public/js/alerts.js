/* eslint-disable */
export function hideAlert() {
  const alerts = document.querySelectorAll('.alert');

  if (alerts.length > 0) {
    alerts.forEach(el => {
      el.parentElement.removeChild(el);
    });
  }
}
export function showAlert(type, msg, time = 10) {
  hideAlert();
  const markup = `<div class='alert alert--${type}'>${msg}</div>`;
  document.querySelector('body').insertAdjacentHTML('afterbegin', markup);
  window.setTimeout(hideAlert, time * 1000);
}
