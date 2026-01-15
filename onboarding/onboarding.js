// Onboarding page scripts

document.getElementById('get-started').addEventListener('click', () => {
  // Close this tab and let user browse
  window.close();
});

document.getElementById('open-options').addEventListener('click', (e) => {
  e.preventDefault();
  chrome.runtime.openOptionsPage();
});
