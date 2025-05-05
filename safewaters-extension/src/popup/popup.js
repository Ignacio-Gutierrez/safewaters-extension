const statusElement = document.getElementById('status');
const enableSafeWatersCheckbox = document.getElementById("enableSafeWaters");

function updateStatus(isActive) {
  if (isActive) {
    statusElement.innerHTML = '<img src="../../assets/sailing.svg" alt="sailing"> Extensión activa';
    statusElement.style.color = 'green';
  } else {
    statusElement.innerHTML = '<img src="../../assets/anchor.svg" alt="anchor">  Extensión inactiva';
    statusElement.style.color = 'red';
  }
}

// Al abrir el popup, lee el estado guardado o lo inicializa en true
chrome.storage.local.get(['safewatersActive'], (result) => {
  let isActive;
  if (typeof result.safewatersActive === "undefined") {
    isActive = true;
    chrome.storage.local.set({ safewatersActive: true });
  } else {
    isActive = result.safewatersActive;
  }
  enableSafeWatersCheckbox.checked = isActive;
  updateStatus(isActive);
});

enableSafeWatersCheckbox.addEventListener("change", function (event) {
  const isActive = event.target.checked;
  updateStatus(isActive);
  chrome.storage.local.set({ safewatersActive: isActive });
});