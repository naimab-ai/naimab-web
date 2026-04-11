const statusEl = document.getElementById('download-status');
const helperEl = document.getElementById('download-helper');
const platformNoteEl = document.getElementById('platform-note');
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

function setStatusAppearance(state, text) {
  if (!statusEl) return;

  statusEl.classList.remove('is-ready', 'is-missing', 'is-error');
  if (state) {
    statusEl.classList.add(state);
  }
  statusEl.textContent = text;
}

function showMissingBanner() {
  if (!missingBannerEl) return;
  missingBannerEl.classList.add('is-visible');
}

function hideMissingBanner() {
  if (!missingBannerEl) return;
  missingBannerEl.classList.remove('is-visible');
}

function applyPlatformCopy() {
  if (!platformNoteEl) return;

  const userAgent = navigator.userAgent || '';
  const isWindows = /Windows/i.test(userAgent);

  platformNoteEl.textContent = isWindows
    ? 'You are on Windows. The installer will download directly once the build is live.'
    : 'Best downloaded from a Windows 10/11 device, but the link can still be shared now.';
}

function applyReadyState({ sizeText }) {
  const statusText = sizeText
    ? `Installer is live · ${sizeText}`
    : 'Installer is live and ready to download';

  setStatusAppearance('is-ready', statusText);
  setDownloadLabels('Download for Windows', 'Start Download');
  setDownloadDisabled(false);

  if (helperEl) {
    helperEl.textContent = 'The current Windows beta is live. Replace the installer at the same endpoint whenever you publish a fresh build.';
  }

  hideMissingBanner();
}

function applyMissingState() {
  setStatusAppearance('is-missing', 'Installer is not live yet');
  setDownloadLabels('Installer Coming Soon', 'Build Pending');
  setDownloadDisabled(true);

  if (helperEl) {
    helperEl.textContent = 'The page is ready, but the current Windows installer has not been uploaded yet.';
  }
}

function applyErrorState() {
  setStatusAppearance('is-error', 'Could not verify the installer right now');
  setDownloadLabels('Retry Download', 'Retry');
  setDownloadDisabled(false);

  if (helperEl) {
    helperEl.textContent = 'We could not confirm the latest build automatically. You can retry the button above or contact the beta team.';
  }
}

async function checkDownloadAvailability() {
  setStatusAppearance('', 'Checking installer availability...');
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
applyPlatformCopy();

const currentUrl = new URL(window.location.href);
if (currentUrl.searchParams.get('download') === 'missing') {
  showMissingBanner();
  currentUrl.searchParams.delete('download');
  window.history.replaceState({}, '', currentUrl.pathname + currentUrl.search + currentUrl.hash);
}

checkDownloadAvailability();
