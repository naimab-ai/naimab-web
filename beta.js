const helperEl = document.getElementById('download-helper');
const missingBannerEl = document.getElementById('download-missing-banner');
const headerEl = document.getElementById('main-header');
const downloadLinks = Array.from(document.querySelectorAll('[data-download-link]'));
const mainLabelEls = Array.from(document.querySelectorAll('[data-download-label-main]'));
const ghostLabelEls = Array.from(document.querySelectorAll('[data-download-label-ghost]'));

function updateHeaderState() {
  if (!headerEl) return;
  headerEl.classList.toggle('scrolled', window.scrollY > 8);
}

function formatBytes(bytes) {
  if (!Number.isFinite(bytes) || bytes <= 0) return '';

  const units = ['B', 'KB', 'MB', 'GB'];
  let value = bytes;
  let unitIndex = 0;

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }

  const formatted = value >= 100 || unitIndex === 0 ? value.toFixed(0) : value.toFixed(1);
  return `${formatted} ${units[unitIndex]}`;
}

function setDownloadLabels(mainLabel, ghostLabel = mainLabel) {
  mainLabelEls.forEach((element) => {
    element.textContent = mainLabel;
  });

  ghostLabelEls.forEach((element) => {
    element.textContent = ghostLabel;
  });
}

function setDownloadDisabled(isDisabled) {
  downloadLinks.forEach((link) => {
    if (isDisabled) {
      link.setAttribute('aria-disabled', 'true');
      link.dataset.disabled = 'true';
      link.tabIndex = -1;
      return;
    }

    link.removeAttribute('aria-disabled');
    delete link.dataset.disabled;
    link.removeAttribute('tabindex');
  });
}

function showMissingBanner() {
  if (!missingBannerEl) return;
  missingBannerEl.classList.add('is-visible');
}

function hideMissingBanner() {
  if (!missingBannerEl) return;
  missingBannerEl.classList.remove('is-visible');
}

function applyReadyState({ sizeText }) {
  setDownloadLabels('Download for Windows', 'Start Download');
  setDownloadDisabled(false);

  if (helperEl) {
    helperEl.textContent = sizeText
      ? `The current Windows beta is live (${sizeText}). Replace the installer at the same endpoint whenever you publish a fresh build.`
      : 'The current Windows beta is live. Replace the installer at the same endpoint whenever you publish a fresh build.';
  }

  hideMissingBanner();
}

function applyMissingState() {
  setDownloadLabels('Installer Coming Soon', 'Build Pending');
  setDownloadDisabled(true);

  if (helperEl) {
    helperEl.textContent = 'The page is ready, but the current Windows installer has not been uploaded yet.';
  }
}

function applyErrorState() {
  setDownloadLabels('Retry Download', 'Retry');
  setDownloadDisabled(false);

  if (helperEl) {
    helperEl.textContent = 'We could not confirm the latest build automatically. You can retry the button above or contact the beta team.';
  }
}

async function checkDownloadAvailability() {
  setDownloadLabels('Checking Build', 'Checking');

  try {
    const response = await fetch('/testx/download', {
      method: 'HEAD',
      cache: 'no-store',
      redirect: 'manual',
    });

    if (response.ok) {
      const size = Number(response.headers.get('content-length'));
      applyReadyState({ sizeText: formatBytes(size) });
      return;
    }

    if (response.status === 404) {
      applyMissingState();
      return;
    }

    applyErrorState();
  } catch {
    applyErrorState();
  }
}

downloadLinks.forEach((link) => {
  link.addEventListener('click', (event) => {
    if (link.dataset.disabled === 'true') {
      event.preventDefault();
    }
  });
});

window.addEventListener('scroll', updateHeaderState, { passive: true });
updateHeaderState();

const currentUrl = new URL(window.location.href);
if (currentUrl.searchParams.get('download') === 'missing') {
  showMissingBanner();
  currentUrl.searchParams.delete('download');
  window.history.replaceState({}, '', currentUrl.pathname + currentUrl.search + currentUrl.hash);
}

checkDownloadAvailability();
