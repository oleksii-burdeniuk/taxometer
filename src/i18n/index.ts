import { getLocales } from 'expo-localization';
import { createContext, createElement, PropsWithChildren, useContext, useEffect, useMemo, useState } from 'react';
import { storage } from '@/lib/storage';
import { Language } from '@/types';

const messages = {
  uk: {
    appName: 'Таксометр', ready: 'Готовий до поїздки', chooseTariff: 'Оберіть тариф і починайте',
    start: 'Почати поїздку', stop: 'Завершити', pause: 'Пауза', resume: 'Продовжити',
    distance: 'Відстань', time: 'Час', waiting: 'Очікування', currentFare: 'Поточна ціна',
    tariffs: 'Тарифи', history: 'Поїздки', settings: 'Налаштування', activeTariff: 'Активний тариф',
    editTariffs: 'Керувати тарифами', recentTrips: 'Останні поїздки', allTrips: 'Усі поїздки',
    noTrips: 'Поїздок поки немає', noTripsHint: 'Завершені поїздки з’являться тут.',
    deleteTrip: 'Видалити поїздку', deleteTripTitle: 'Видалити цю поїздку?',
    deleteTripBody: 'Історію поїздки та чек буде видалено без можливості відновлення.',
    finishTripTitle: 'Завершити поїздку?', finishTripBody: 'Після завершення нарахування зупиниться і буде створено підсумковий чек.',
    deleteTariffTitle: 'Видалити тариф?', deleteTariffBody: 'Цю дію неможливо скасувати. Збережені поїздки не зміняться.',
    addTariff: 'Новий тариф', editTariff: 'Редагувати тариф', tariffName: 'Назва тарифу',
    baseFare: 'Посадка', includedKm: 'Включено км', pricePerKm: 'Ціна за км',
    waitingRate: 'Очікування / год', minimumFare: 'Мінімальна ціна', currency: 'Валюта',
    crossoverSpeed: 'Швидкість перемикання', crossoverAuto: 'Розраховується автоматично зі ставок нижче', hourShort: 'год', crossoverHint: 'Нижче цієї швидкості нараховується оплата за час. На цій швидкості та вище — за відстань. Окремо змінювати цю межу не потрібно.',
    save: 'Зберегти', cancel: 'Скасувати', close: 'Закрити', makeDefault: 'Зробити основним', default: 'Основний',
    delete: 'Видалити', tripSummary: 'Підсумок поїздки', total: 'До сплати',
    shareReceipt: 'Поділитися чеком', newTrip: 'Нова поїздка', receipt: 'Чек',
    receiptNumber: 'Номер поїздки', started: 'Початок', finished: 'Завершення', tariff: 'Тариф',
    rideReceipt: 'ЧЕК ПОЇЗДКИ', baseCharge: 'Посадка', distanceCharge: 'Плата за відстань',
    waitingCharge: 'Плата за очікування', minimumAdjustment: 'Доплата до мінімуму',
    includedAllowance: 'Включено в посадку',
    tariffType: 'Тип тарифу', singleTariff: 'Одиночний тариф', zonedTariff: 'Зональний набір',
    groupName: 'Назва тарифного набору', zoneRates: 'Ставки зон', officialPreset: 'Офіційний пресет',
    deleteSet: 'Видалити тарифний набір', gpsBillingPaused: 'Слабкий GPS — нарахування призупинено',
    paidTime: 'Оплачуваний час',
    routeMode: 'Маршрут', sameZoneRoute: 'В одній зоні', crossZoneRoute: 'Між зонами',
    higherTariffTitle: 'Перехід на вищий тариф', higherTariffBody: 'Повідомте пасажира про зміну ставки перед перемиканням.', applyTariff: 'Перемкнути',
    periodSuggestionTitle: 'Час змінити тариф', periodSuggestionBody: 'За поточним часом або календарем має діяти інший тариф. Перемкнути його зараз?',
    tariffZone: 'Тарифна зона', tariffPeriod: 'Період', zoneOne: 'Зона I', zoneTwo: 'Зона II',
    day: 'День', nightHoliday: 'Ніч / свята', zoneSwitchHint: 'Перемикайте на межі зони та повідомте пасажира. Якщо старт і фініш в одній зоні — залиште одну зону на весь маршрут.',
    thankYou: 'Дякуємо за поїздку!', notFiscal: 'Не є фіскальним чеком',
    receiptError: 'Не вдалося створити чек. Спробуйте ще раз.',
    language: 'Мова', ukrainian: 'Українська', english: 'English', polish: 'Polski',
    receiptLanguage: 'Мова чека',
    locationTitle: 'Потрібен доступ до геолокації', locationBody: 'Дозвольте доступ, щоб рахувати відстань поїздки.',
    allow: 'Надати доступ', locationError: 'Не вдалося отримати геолокацію. Перевірте GPS і дозвіл.',
    cannotDelete: 'Основний тариф не можна видалити', invalidForm: 'Заповніть назву та введіть коректні числа.',
    foregroundNote: 'GPS працює у фоні — можна заблокувати екран.',
    backgroundPermissionTitle: 'Фонове відстеження',
    backgroundPermissionBody: 'Для точного розрахунку під час заблокованого екрана дозвольте геолокацію «Завжди». Система може відкрити налаштування.',
    backgroundPermissionDenied: 'Фоновий доступ не надано. Увімкніть дозвіл «Завжди» в системних налаштуваннях.',
    continue: 'Продовжити', trackingNotification: 'Триває поїздка — відстань і ціна розраховуються.',
    readyStatus: 'ГОТОВО', gpsStatus: 'GPS', pausedStatus: 'ПАУЗА',
  },
  en: {
    appName: 'Taxometer', ready: 'Ready for a ride', chooseTariff: 'Choose a tariff and get started',
    start: 'Start ride', stop: 'Finish', pause: 'Pause', resume: 'Resume', distance: 'Distance',
    time: 'Time', waiting: 'Waiting', currentFare: 'Current fare', tariffs: 'Tariffs', history: 'Trips',
    settings: 'Settings', activeTariff: 'Active tariff', editTariffs: 'Manage tariffs',
    recentTrips: 'Recent trips', allTrips: 'All trips', noTrips: 'No trips yet',
    noTripsHint: 'Completed rides will appear here.', addTariff: 'New tariff', editTariff: 'Edit tariff',
    deleteTrip: 'Delete trip', deleteTripTitle: 'Delete this trip?',
    deleteTripBody: 'The trip history and receipt will be permanently deleted.',
    finishTripTitle: 'Finish this ride?', finishTripBody: 'Billing will stop and the final receipt will be created.',
    deleteTariffTitle: 'Delete this tariff?', deleteTariffBody: 'This cannot be undone. Saved trips will not be changed.',
    tariffName: 'Tariff name', baseFare: 'Base fare', includedKm: 'Included km', pricePerKm: 'Price per km',
    waitingRate: 'Waiting / hour', minimumFare: 'Minimum fare', currency: 'Currency', save: 'Save',
    crossoverSpeed: 'Cross-over speed', crossoverAuto: 'Calculated automatically from the rates below', hourShort: 'h', crossoverHint: 'Below this speed, time is charged. At this speed and above, distance is charged. You do not need to set this limit separately.',
    cancel: 'Cancel', close: 'Close', makeDefault: 'Make default', default: 'Default', delete: 'Delete',
    tripSummary: 'Trip summary', total: 'Amount due', shareReceipt: 'Share receipt',
    newTrip: 'New trip', receipt: 'Receipt', receiptNumber: 'Trip number', started: 'Started',
    finished: 'Finished', tariff: 'Tariff', language: 'Language', ukrainian: 'Українська',
    receiptLanguage: 'Receipt language',
    rideReceipt: 'RIDE RECEIPT', baseCharge: 'Base fare', distanceCharge: 'Distance charge',
    waitingCharge: 'Waiting charge', minimumAdjustment: 'Minimum fare adjustment',
    includedAllowance: 'Included with base fare',
    tariffType: 'Tariff type', singleTariff: 'Single tariff', zonedTariff: 'Zoned set',
    groupName: 'Tariff set name', zoneRates: 'Zone rates', officialPreset: 'Official preset',
    deleteSet: 'Delete tariff set', gpsBillingPaused: 'Weak GPS — billing paused', paidTime: 'Charged time',
    routeMode: 'Route', sameZoneRoute: 'Within one zone', crossZoneRoute: 'Between zones',
    higherTariffTitle: 'Higher tariff', higherTariffBody: 'Tell the passenger about the new rate before switching.', applyTariff: 'Switch',
    periodSuggestionTitle: 'Tariff change due', periodSuggestionBody: 'The current time or calendar requires another tariff. Switch now?',
    tariffZone: 'Tariff zone', tariffPeriod: 'Period', zoneOne: 'Zone I', zoneTwo: 'Zone II',
    day: 'Day', nightHoliday: 'Night / holidays', zoneSwitchHint: 'Switch at the zone boundary and tell the passenger. If start and finish are in one zone, keep one zone for the whole route.',
    thankYou: 'Thank you for riding!', notFiscal: 'This is not a fiscal receipt',
    receiptError: 'Could not create the receipt. Please try again.',
    english: 'English', polish: 'Polski', locationTitle: 'Location access required',
    locationBody: 'Allow location access to calculate trip distance.', allow: 'Allow access',
    locationError: 'Could not access location. Check GPS and permission.',
    cannotDelete: 'The default tariff cannot be deleted', invalidForm: 'Enter a name and valid numbers.',
    foregroundNote: 'GPS runs in the background — you can lock the screen.',
    backgroundPermissionTitle: 'Background tracking',
    backgroundPermissionBody: 'To calculate accurately while the screen is locked, allow location access “Always”. The system may open Settings.',
    backgroundPermissionDenied: 'Background access was not granted. Enable “Always” location access in system settings.',
    continue: 'Continue', trackingNotification: 'Ride in progress — distance and fare are being calculated.',
    readyStatus: 'READY', gpsStatus: 'GPS', pausedStatus: 'PAUSED',
  },
  pl: {
    appName: 'Taksometr', ready: 'Gotowy do kursu', chooseTariff: 'Wybierz taryfę i rozpocznij',
    start: 'Rozpocznij kurs', stop: 'Zakończ', pause: 'Pauza', resume: 'Wznów', distance: 'Dystans',
    time: 'Czas', waiting: 'Postój', currentFare: 'Aktualna cena', tariffs: 'Taryfy', history: 'Kursy',
    settings: 'Ustawienia', activeTariff: 'Aktywna taryfa', editTariffs: 'Zarządzaj taryfami',
    recentTrips: 'Ostatnie kursy', allTrips: 'Wszystkie kursy', noTrips: 'Brak kursów',
    noTripsHint: 'Zakończone kursy pojawią się tutaj.', addTariff: 'Nowa taryfa', editTariff: 'Edytuj taryfę',
    deleteTrip: 'Usuń kurs', deleteTripTitle: 'Usunąć ten kurs?',
    deleteTripBody: 'Historia kursu i rachunek zostaną trwale usunięte.',
    finishTripTitle: 'Zakończyć kurs?', finishTripBody: 'Naliczanie zostanie zatrzymane i powstanie rachunek końcowy.',
    deleteTariffTitle: 'Usunąć taryfę?', deleteTariffBody: 'Tej operacji nie można cofnąć. Zapisane kursy pozostaną bez zmian.',
    tariffName: 'Nazwa taryfy', baseFare: 'Opłata początkowa', includedKm: 'Km w cenie',
    pricePerKm: 'Cena za km', waitingRate: 'Postój / godz.', minimumFare: 'Cena minimalna',
    currency: 'Waluta', save: 'Zapisz', cancel: 'Anuluj', close: 'Zamknij', makeDefault: 'Ustaw jako domyślną',
    crossoverSpeed: 'Prędkość graniczna', crossoverAuto: 'Obliczana automatycznie z poniższych stawek', hourShort: 'godz.', crossoverHint: 'Poniżej tej prędkości naliczany jest czas. Przy tej prędkości i powyżej naliczany jest dystans. Nie trzeba ustawiać tej granicy osobno.',
    default: 'Domyślna', delete: 'Usuń', tripSummary: 'Podsumowanie kursu', total: 'Do zapłaty',
    shareReceipt: 'Udostępnij rachunek', newTrip: 'Nowy kurs', receipt: 'Rachunek',
    receiptNumber: 'Numer kursu', started: 'Początek', finished: 'Koniec', tariff: 'Taryfa',
    rideReceipt: 'RACHUNEK ZA KURS', baseCharge: 'Opłata początkowa', distanceCharge: 'Opłata za dystans',
    waitingCharge: 'Opłata za postój', minimumAdjustment: 'Dopłata do ceny minimalnej',
    includedAllowance: 'Wliczono w opłatę początkową',
    tariffType: 'Typ taryfy', singleTariff: 'Pojedyncza taryfa', zonedTariff: 'Zestaw strefowy',
    groupName: 'Nazwa zestawu taryf', zoneRates: 'Stawki stref', officialPreset: 'Oficjalny zestaw',
    deleteSet: 'Usuń zestaw taryf', gpsBillingPaused: 'Słaby GPS — naliczanie wstrzymane', paidTime: 'Czas płatny',
    routeMode: 'Trasa', sameZoneRoute: 'W jednej strefie', crossZoneRoute: 'Między strefami',
    higherTariffTitle: 'Wyższa taryfa', higherTariffBody: 'Przed przełączeniem poinformuj pasażera o zmianie stawki.', applyTariff: 'Przełącz',
    periodSuggestionTitle: 'Czas zmienić taryfę', periodSuggestionBody: 'Według aktualnej godziny lub kalendarza powinna obowiązywać inna taryfa. Przełączyć teraz?',
    tariffZone: 'Strefa taryfowa', tariffPeriod: 'Pora', zoneOne: 'Strefa I', zoneTwo: 'Strefa II',
    day: 'Dzień', nightHoliday: 'Noc / święta', zoneSwitchHint: 'Przełącz na granicy strefy i poinformuj pasażera. Jeśli początek i koniec są w tej samej strefie, pozostaw jedną strefę na cały kurs.',
    thankYou: 'Dziękujemy za kurs!', notFiscal: 'To nie jest paragon fiskalny',
    receiptError: 'Nie udało się utworzyć rachunku. Spróbuj ponownie.',
    language: 'Język', ukrainian: 'Українська', english: 'English', polish: 'Polski',
    receiptLanguage: 'Język rachunku',
    locationTitle: 'Wymagany dostęp do lokalizacji', locationBody: 'Zezwól na lokalizację, aby liczyć dystans.',
    allow: 'Zezwól', locationError: 'Nie można pobrać lokalizacji. Sprawdź GPS i uprawnienia.',
    cannotDelete: 'Nie można usunąć domyślnej taryfy', invalidForm: 'Podaj nazwę i poprawne liczby.',
    foregroundNote: 'GPS działa w tle — możesz zablokować ekran.',
    backgroundPermissionTitle: 'Śledzenie w tle',
    backgroundPermissionBody: 'Aby liczyć kurs po zablokowaniu ekranu, zezwól na lokalizację „Zawsze”. System może otworzyć Ustawienia.',
    backgroundPermissionDenied: 'Brak dostępu w tle. Włącz lokalizację „Zawsze” w ustawieniach systemowych.',
    continue: 'Kontynuuj', trackingNotification: 'Kurs trwa — dystans i cena są obliczane.',
    readyStatus: 'GOTOWY', gpsStatus: 'GPS', pausedStatus: 'PAUZA',
  },
} as const;

export type TranslationKey = keyof typeof messages.uk;
const locales: Record<Language, string> = { uk: 'uk-UA', en: 'en-US', pl: 'pl-PL' };

type I18nValue = {
  language: Language; locale: string; setLanguage: (value: Language) => void; t: (key: TranslationKey) => string;
  receiptLanguage: Language; receiptLocale: string; setReceiptLanguage: (value: Language) => void;
  receiptT: (key: TranslationKey) => string;
};
const I18nContext = createContext<I18nValue | null>(null);

export function I18nProvider({ children }: PropsWithChildren) {
  const deviceCode = getLocales()[0]?.languageCode;
  const initial: Language = deviceCode === 'pl' ? 'pl' : deviceCode === 'en' ? 'en' : 'uk';
  const [language, updateLanguage] = useState<Language>(initial);
  const [receiptLanguage, updateReceiptLanguage] = useState<Language>(initial);

  useEffect(() => {
    Promise.all([storage.getLanguage(), storage.getReceiptLanguage()]).then(([savedLanguage, savedReceiptLanguage]) => {
      if (savedLanguage) updateLanguage(savedLanguage);
      if (savedReceiptLanguage) updateReceiptLanguage(savedReceiptLanguage);
      else if (savedLanguage) updateReceiptLanguage(savedLanguage);
    });
  }, []);
  const setLanguage = (value: Language) => { updateLanguage(value); void storage.setLanguage(value); };
  const setReceiptLanguage = (value: Language) => { updateReceiptLanguage(value); void storage.setReceiptLanguage(value); };
  const value = useMemo(() => ({
    language, locale: locales[language], setLanguage, t: (key: TranslationKey) => messages[language][key],
    receiptLanguage, receiptLocale: locales[receiptLanguage], setReceiptLanguage,
    receiptT: (key: TranslationKey) => messages[receiptLanguage][key],
  }), [language, receiptLanguage]);
  return createElement(I18nContext.Provider, { value }, children);
}

export function useI18n() {
  const value = useContext(I18nContext);
  if (!value) throw new Error('useI18n must be used inside I18nProvider');
  return value;
}
