'use strict';

// The Google tag will be configured in the head once the live stream is available.
window.dataLayer = window.dataLayer || [];
window.gtag = window.gtag || function () { window.dataLayer.push(arguments); };

function trackEvent(name, parameters) {
  window.gtag('event', name, parameters);
}

function trackLinkClick(event) {
  const link = event.target.closest('a[data-analytics]');
  if (!link || event.defaultPrevented) return;
  const parameters = { cta_location: link.dataset.location };
  if (link.dataset.analytics === 'navigation_click') {
    parameters.nav_target = link.dataset.target;
  } else {
    parameters.link_url = link.href;
    parameters.link_domain = new URL(link.href).hostname;
  }
  if (link.dataset.analytics === 'download_click') {
    parameters.file_name = 'Svitlyk.exe';
    parameters.file_extension = 'exe';
  }
  if (link.dataset.analytics === 'contact_click') parameters.contact_method = 'telegram';
  trackEvent(link.dataset.analytics, parameters);
}

document.addEventListener('click', trackLinkClick);
document.querySelectorAll('.faq details').forEach(item => {
  item.addEventListener('toggle', () => { if (item.open) trackEvent('faq_open', { faq_question: item.dataset.question }); });
});
document.addEventListener('click', event => {
  if (event.target.closest('a.download')) document.querySelectorAll('.download-hint').forEach(hint => { hint.hidden = false; });
});
document.addEventListener('auxclick', event => {
  if (event.button === 1) trackLinkClick(event);
});

if ('IntersectionObserver' in window) {
  const viewedSections = new Set();
  const visibleSections = new Set();
  const recordSectionViews = () => {
    if (document.visibilityState !== 'visible') return;
    visibleSections.forEach(section => {
      if (viewedSections.has(section)) return;
      viewedSections.add(section);
      trackEvent('section_view', { section_name: section.dataset.section });
      sectionObserver.unobserve(section);
      visibleSections.delete(section);
    });
  };
  const sectionObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting && entry.intersectionRatio >= 0.25) visibleSections.add(entry.target);
      else visibleSections.delete(entry.target);
    });
    recordSectionViews();
  }, { threshold: 0.25 });
  document.querySelectorAll('[data-section]').forEach(section => sectionObserver.observe(section));
  document.addEventListener('visibilitychange', recordSectionViews);
}

const popup = document.querySelector('#app-popup');
const trayButton = document.querySelector('#tray-button');
const desktop = document.querySelector('#desktop');
const stateSwitch = document.querySelector('#state-switch');
const notification = document.querySelector('#notification');
const reminderButton = document.querySelector('#reminder-button');
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
let isOff = false;
let notificationTimer;

function setPopup(open) {
  popup.classList.toggle('is-open', open);
  popup.inert = !open;
  trayButton.setAttribute('aria-expanded', String(open));
  trayButton.setAttribute('aria-label', open ? 'Сховати приклад Світлика' : 'Відкрити приклад Світлика');
}

trayButton.addEventListener('click', () => {
  const open = !popup.classList.contains('is-open');
  setPopup(open);
  trackEvent('demo_interaction', { demo_action: open ? 'tray_open' : 'tray_close' });
});
desktop.addEventListener('keydown', event => {
  if (event.key === 'Escape' && popup.classList.contains('is-open')) {
    setPopup(false);
    trayButton.focus();
    trackEvent('demo_interaction', { demo_action: 'tray_close', input_method: 'keyboard' });
  }
});

stateSwitch.addEventListener('click', () => {
  isOff = !isOff;
  desktop.classList.toggle('is-off', isOff);
  stateSwitch.setAttribute('aria-pressed', String(isOff));
  stateSwitch.querySelector('.button-label').textContent = isOff ? 'Показати зі світлом' : 'Показати без світла';
  document.querySelector('#demo-status').textContent = isOff ? 'Світла немає' : 'Світло є';
  document.querySelector('#demo-until').textContent = isOff ? 'До увімкнення' : 'До вимкнення';
  document.querySelector('#demo-hours').innerHTML = (isOff ? '3' : '1') + ' <small>год</small>';
  document.querySelector('#demo-next').textContent = isOff ? 'Поточне відключення' : 'Наступне відключення';
  document.querySelector('#system-clock').textContent = isOff ? '11:35' : '09:35';
  document.querySelector('#timeline-marker').style.left = isOff ? '48.3%' : '40%';
  document.querySelector('#demo-note').textContent = isOff ? 'Сіра лампочка — за графіком зараз немає світла.' : 'Тут — приклад графіка. Свій графік побачиш у застосунку, коли вкажеш адресу.';
  setPopup(true);
  trackEvent('demo_interaction', { demo_action: 'state_change', demo_state: isOff ? 'off' : 'on' });
});

function playNotification() {
  notification.classList.remove('is-waiting', 'play');
  if (!reducedMotion.matches) {
    void notification.offsetWidth;
    notification.classList.add('play');
  }
}

reminderButton.addEventListener('click', () => {
  trackEvent('demo_interaction', { demo_action: 'reminder_preview' });
  clearTimeout(notificationTimer);
  playNotification();
  reminderButton.querySelector('.button-label').textContent = 'Ось так Світлик нагадає';
  reminderButton.querySelector('use').setAttribute('href', '#icon-check');
  notificationTimer = setTimeout(() => {
    reminderButton.querySelector('.button-label').textContent = 'Показати ще раз';
    reminderButton.querySelector('use').setAttribute('href', '#icon-refresh');
  }, 4500);
});

if ('IntersectionObserver' in window && !reducedMotion.matches) {
  document.documentElement.classList.add('js');
  const notificationStage = notification.closest('.notification-stage');
  notificationStage.parentElement.classList.remove('reveal');
  notification.classList.add('is-waiting');
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.target === notificationStage) {
        if (entry.isIntersecting && entry.intersectionRatio >= 0.6) {
          if (notification.classList.contains('is-waiting')) playNotification();
          observer.unobserve(entry.target);
        }
      } else if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: [0.12, 0.6] });
  document.querySelectorAll('.reveal').forEach(element => observer.observe(element));
  observer.observe(notificationStage);
}
