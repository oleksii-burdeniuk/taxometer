import { getLocales } from 'expo-localization';
import { createContext, createElement, PropsWithChildren, useContext, useEffect, useMemo, useState } from 'react';
import { storage } from '@/lib/storage';
import { Language } from '@/types';

const messages = {
  uk: {
    appName: 'Таксометр', ready: 'Готовий до поїздки', chooseTariff: 'Оберіть тариф і починайте',
    start: 'Почати поїздку', stop: 'Завершити', pause: 'Пауза', resume: 'Продовжити',
    fareMode: 'Спосіб розрахунку', meteredFare: 'За таксометром', agreedFare: 'Узгоджена ціна',
    agreedFareHint: 'Ця сума буде основною ціною для клієнта та в чеку.', agreedFareAmount: 'Узгоджена сума', invalidAgreedFare: 'Введіть узгоджену суму, більшу за нуль.',
    pickupAddress: 'Адреса посадки', dropoffAddress: 'Адреса висадки', addressOptional: 'Необов’язково', useTaximeter: 'Рахувати таксометром', useTaximeterHint: 'GPS окремо рахує відстань і тариф.', fixedPriceOnlyHint: 'Без GPS і тарифікації — лише час та узгоджена ціна.', fixedPriceRide: 'Поїздка за узгодженою ціною',
    ridePaused: 'Поїздку поставлено на паузу', finalSummary: 'Підсумок поїздки', clientDiscount: 'Знижка для клієнта', discountHint: 'Оберіть варіант або перетягніть повзунок', discount: 'Знижка', finishAndReceipt: 'Завершити та створити чек', continueRide: 'Залишити на паузі',
    discountPercentMode: 'У відсотках', finalPriceMode: 'Кінцева ціна', finalPrice: 'Ціна для клієнта', finalPriceHint: 'Введіть кінцеву суму — точну знижку буде розраховано автоматично.', invalidFinalPrice: 'Ціна має бути від нуля до суми поїздки.',
    decreasePrice: 'Зменшити ціну на одну копійку', increasePrice: 'Збільшити ціну на одну копійку',
    distance: 'Відстань', time: 'Час', waiting: 'Оплачуваний час', currentFare: 'Поточна ціна',
    tariffs: 'Тарифи', history: 'Поїздки', settings: 'Налаштування', activeTariff: 'Активний тариф',
    editTariffs: 'Керувати тарифами', recentTrips: 'Останні поїздки', allTrips: 'Усі поїздки',
    statistics: 'Статистика', daily: 'День', weekly: 'Тиждень', monthly: 'Місяць', earnings: 'Заробіток', rides: 'Поїздки', averageRide: 'Середній чек', earningsChart: 'Динаміка заробітку', previousPeriod: 'Попередній період', nextPeriod: 'Наступний період', vsPrevious: 'до попереднього періоду', noComparison: 'Немає даних для порівняння', earningsPerHour: 'За годину поїздок', earningsPerKm: 'Заробіток / км', periodTrips: 'Поїздки за період', noTripsPeriod: 'За цей період поїздок немає',
    noTrips: 'Поїздок поки немає', noTripsHint: 'Завершені поїздки з’являться тут.',
    deleteTrip: 'Видалити поїздку', deleteTripTitle: 'Видалити цю поїздку?',
    deleteTripBody: 'Історію поїздки та чек буде видалено без можливості відновлення.',
    finishTripTitle: 'Завершити поїздку?', finishTripBody: 'Після завершення нарахування зупиниться і буде створено підсумковий чек.',
    deleteTariffTitle: 'Видалити тариф?', deleteTariffBody: 'Цю дію неможливо скасувати. Збережені поїздки не зміняться.',
    addTariff: 'Новий тариф', editTariff: 'Редагувати тариф', tariffName: 'Назва тарифу',
    baseFare: 'Посадка', includedKm: 'Включено км', pricePerKm: 'Ціна за км',
    waitingRate: 'Оплата за час / год', minimumFare: 'Мінімальна ціна', currency: 'Валюта', currencyCode: 'Код валюти', addCurrency: 'Додати валюту', useCurrency: 'Використати валюту',
    crossoverSpeed: 'Швидкість перемикання', crossoverAuto: 'Розраховується автоматично зі ставок нижче', hourShort: 'год', crossoverHint: 'Нижче цієї швидкості нараховується оплата за час. На цій швидкості та вище — за відстань. Окремо змінювати цю межу не потрібно.',
    save: 'Зберегти', cancel: 'Скасувати', close: 'Закрити', done: 'Готово', back: 'Назад', makeDefault: 'Зробити основним', default: 'Основний',
    delete: 'Видалити', tripSummary: 'Підсумок поїздки', total: 'До сплати',
    shareReceipt: 'Поділитися чеком', newTrip: 'Нова поїздка', receipt: 'Чек',
    receiptNumber: 'Номер поїздки', started: 'Початок', finished: 'Завершення', tariff: 'Тариф',
    rideReceipt: 'ЧЕК ПОЇЗДКИ', baseCharge: 'Посадка', distanceCharge: 'Плата за відстань',
    waitingCharge: 'Оплата за час', minimumAdjustment: 'Доплата до мінімуму',
    includedAllowance: 'Включено в посадку',
    tariffType: 'Тип тарифу', singleTariff: 'Одиночний тариф', zonedTariff: 'Зональний набір',
    tariffSet: 'Набір тарифів', tariffVariants: 'Варіанти тарифу', addVariant: 'Додати варіант', removeVariant: 'Видалити варіант',
    tariffOverview: 'Ваші тарифи', tariffOverviewHint: 'Керуйте ставками та вибирайте, що показувати перед стартом поїздки.', rates: 'ставок', showOnHomeHint: 'Доступний для вибору перед поїздкою', homeShort: 'Головна', tariffEditingLocked: 'Під час активної поїздки редагування та зміна основного тарифу недоступні.',
    variantName: 'Назва варіанта', zoneOptional: 'Зона (необов’язково)', schedule: 'Розклад', scheduleAlways: 'Завжди', scheduleWeekday: 'Будні / день', scheduleNightHoliday: 'Ніч / неділі / свята', startsAt: 'Від', endsAt: 'До',
    showOnHome: 'Показувати на головній', atLeastOneHomeTariff: 'На головній має залишитися хоча б один тариф.', rideTariff: 'Тариф поїздки',
    groupName: 'Назва тарифного набору', zoneRates: 'Ставки зон', officialPreset: 'Офіційний пресет', presetEnabled: 'Увімкнено', presetDisabled: 'Вимкнено', showPresetOnHome: 'Показувати пресет на головній', presetHiddenHint: 'Пресет вимкнений. Його тарифи приховані на головній.', noHomeTariffs: 'Немає активних тарифів', noHomeTariffsHint: 'Увімкніть пресет або тариф у розділі тарифів.',
    deleteSet: 'Видалити тарифний набір', gpsBillingPaused: 'Відновлюємо GPS — нарахування тимчасово призупинено',
    paidTime: 'Оплачуваний час',
    routeMode: 'Маршрут', sameZoneRoute: 'В одній зоні', crossZoneRoute: 'Між зонами',
    higherTariffTitle: 'Перехід на вищий тариф', higherTariffBody: 'Повідомте пасажира про зміну ставки перед перемиканням.', applyTariff: 'Перемкнути',
    startTariffTitle: 'Який тариф застосувати?', startTariffBody: 'За поточним часом або календарем рекомендовано інший тариф.', selectedTariffLabel: 'Вибрано', recommendedTariffLabel: 'Рекомендовано', keepSelectedTariff: 'Залишити вибраний', useRecommendedTariff: 'Застосувати рекомендований',
    periodSuggestionTitle: 'Час змінити тариф', periodSuggestionBody: 'За поточним часом або календарем має діяти інший тариф. Перемкнути його зараз?',
    tariffZone: 'Тарифна зона', tariffPeriod: 'Період', zoneOne: 'Зона I', zoneTwo: 'Зона II',
    day: 'День', nightHoliday: 'Ніч / свята', zoneSwitchHint: 'Перемикайте тариф, коли змінюється зона, час або інша тарифна умова. Перед переходом на вищу ставку повідомте пасажира.',
    thankYou: 'Дякуємо за поїздку!', notFiscal: 'Не є фіскальним чеком',
    receiptError: 'Не вдалося створити чек. Спробуйте ще раз.',
    language: 'Мова', ukrainian: 'Українська', english: 'English', polish: 'Polski',
    receiptLanguage: 'Мова чека',
    appearance: 'Вигляд', theme: 'Тема', themeSystem: 'Системна', themeLight: 'Світла', themeDark: 'Темна',
    activeRideDisplay: 'Активна поїздка поза застосунком', floatingOverlay: 'Плаваючий таксометр', floatingOverlayHint: 'Показувати суму, час, відстань і тариф поверх інших застосунків.', floatingOverlayPermission: 'Потрібен системний дозвіл «Поверх інших застосунків».',
    locationTitle: 'Потрібен доступ до геолокації', locationBody: 'Дозвольте доступ, щоб рахувати відстань поїздки.',
    allow: 'Надати доступ', locationError: 'Не вдалося отримати геолокацію. Перевірте GPS і дозвіл.',
    cannotDelete: 'Основний тариф не можна видалити', invalidForm: 'Не вдалося зберегти тариф',
    validationName: 'Заповніть назву тарифу та всіх його варіантів.', validationDuplicate: 'Тариф або його варіанти мають однакові назви.', validationNumbers: 'Перевірте числові поля. Дозволені лише невід’ємні числа.', validationPrice: 'Ціна за кілометр має бути більшою за нуль.', validationMinimumFare: 'Мінімальна ціна має бути нульовою або не меншою за ціну посадки.', validationSchedule: 'Введіть різний час початку й завершення у форматі 00:00–23:59.',
    foregroundNote: 'GPS працює у фоні — можна заблокувати екран.',
    backgroundPermissionTitle: 'Фонове відстеження',
    backgroundPermissionBody: 'Для точного розрахунку під час заблокованого екрана дозвольте геолокацію «Завжди». Система може відкрити налаштування.',
    backgroundPermissionDenied: 'Фоновий доступ не надано. Увімкніть дозвіл «Завжди» в системних налаштуваннях.',
    continue: 'Продовжити', trackingNotification: 'Триває поїздка — відстань і ціна розраховуються.',
    readyStatus: 'ГОТОВО', gpsStatus: 'GPS', fixedStatus: 'ФІКСОВАНА', pausedStatus: 'ПАУЗА',
  },
  en: {
    appName: 'Taxometer', ready: 'Ready for a ride', chooseTariff: 'Choose a tariff and get started',
    start: 'Start ride', stop: 'Finish', pause: 'Pause', resume: 'Resume', distance: 'Distance',
    fareMode: 'Pricing method', meteredFare: 'Taximeter fare', agreedFare: 'Agreed price',
    agreedFareHint: 'This amount will be the main passenger price and receipt total.', agreedFareAmount: 'Agreed amount', invalidAgreedFare: 'Enter an agreed amount greater than zero.',
    pickupAddress: 'Pickup address', dropoffAddress: 'Drop-off address', addressOptional: 'Optional', useTaximeter: 'Run taximeter', useTaximeterHint: 'GPS calculates distance and the metered fare separately.', fixedPriceOnlyHint: 'No GPS or tariff billing — only time and the agreed price.', fixedPriceRide: 'Fixed-price ride',
    ridePaused: 'Ride paused', finalSummary: 'Ride summary', clientDiscount: 'Passenger discount', discountHint: 'Choose an option or drag the slider', discount: 'Discount', finishAndReceipt: 'Finish and create receipt', continueRide: 'Keep paused',
    discountPercentMode: 'Percentage', finalPriceMode: 'Final price', finalPrice: 'Passenger price', finalPriceHint: 'Enter the final amount and the exact discount will be calculated automatically.', invalidFinalPrice: 'The price must be between zero and the ride amount.',
    decreasePrice: 'Decrease price by one cent', increasePrice: 'Increase price by one cent',
    time: 'Time', waiting: 'Charged time', currentFare: 'Current fare', tariffs: 'Tariffs', history: 'Trips',
    settings: 'Settings', activeTariff: 'Active tariff', editTariffs: 'Manage tariffs',
    statistics: 'Statistics', daily: 'Day', weekly: 'Week', monthly: 'Month', earnings: 'Earnings', rides: 'Rides', averageRide: 'Average ride', earningsChart: 'Earnings trend', previousPeriod: 'Previous period', nextPeriod: 'Next period', vsPrevious: 'vs previous period', noComparison: 'No previous data to compare', earningsPerHour: 'Per ride hour', earningsPerKm: 'Earnings / km', periodTrips: 'Trips in this period', noTripsPeriod: 'No trips in this period',
    recentTrips: 'Recent trips', allTrips: 'All trips', noTrips: 'No trips yet',
    noTripsHint: 'Completed rides will appear here.', addTariff: 'New tariff', editTariff: 'Edit tariff',
    deleteTrip: 'Delete trip', deleteTripTitle: 'Delete this trip?',
    deleteTripBody: 'The trip history and receipt will be permanently deleted.',
    finishTripTitle: 'Finish this ride?', finishTripBody: 'Billing will stop and the final receipt will be created.',
    deleteTariffTitle: 'Delete this tariff?', deleteTariffBody: 'This cannot be undone. Saved trips will not be changed.',
    tariffName: 'Tariff name', baseFare: 'Base fare', includedKm: 'Included km', pricePerKm: 'Price per km',
    waitingRate: 'Time tariff / hour', minimumFare: 'Minimum fare', currency: 'Currency', currencyCode: 'Currency code', addCurrency: 'Add currency', useCurrency: 'Use currency', save: 'Save',
    crossoverSpeed: 'Cross-over speed', crossoverAuto: 'Calculated automatically from the rates below', hourShort: 'h', crossoverHint: 'Below this speed, time is charged. At this speed and above, distance is charged. You do not need to set this limit separately.',
    cancel: 'Cancel', close: 'Close', done: 'Done', back: 'Back', makeDefault: 'Make default', default: 'Default', delete: 'Delete',
    tripSummary: 'Trip summary', total: 'Amount due', shareReceipt: 'Share receipt',
    newTrip: 'New trip', receipt: 'Receipt', receiptNumber: 'Trip number', started: 'Started',
    finished: 'Finished', tariff: 'Tariff', language: 'Language', ukrainian: 'Українська',
    receiptLanguage: 'Receipt language',
    appearance: 'Appearance', theme: 'Theme', themeSystem: 'System', themeLight: 'Light', themeDark: 'Dark',
    activeRideDisplay: 'Active ride outside the app', floatingOverlay: 'Floating taximeter', floatingOverlayHint: 'Show fare, time, distance and tariff over other apps.', floatingOverlayPermission: 'The “Display over other apps” system permission is required.',
    rideReceipt: 'RIDE RECEIPT', baseCharge: 'Base fare', distanceCharge: 'Distance charge',
    waitingCharge: 'Time tariff charge', minimumAdjustment: 'Minimum fare adjustment',
    includedAllowance: 'Included with base fare',
    tariffType: 'Tariff type', singleTariff: 'Single tariff', zonedTariff: 'Zoned set',
    tariffSet: 'Tariff set', tariffVariants: 'Tariff variants', addVariant: 'Add variant', removeVariant: 'Remove variant',
    tariffOverview: 'Your tariffs', tariffOverviewHint: 'Manage rates and choose what appears before starting a ride.', rates: 'rates', showOnHomeHint: 'Available before starting a ride', homeShort: 'Home', tariffEditingLocked: 'Editing and changing the default tariff are unavailable during an active ride.',
    variantName: 'Variant name', zoneOptional: 'Zone (optional)', schedule: 'Schedule', scheduleAlways: 'Always', scheduleWeekday: 'Weekdays / day', scheduleNightHoliday: 'Night / Sundays / holidays', startsAt: 'From', endsAt: 'To',
    showOnHome: 'Show on home screen', atLeastOneHomeTariff: 'At least one tariff must remain on the home screen.', rideTariff: 'Ride tariff',
    groupName: 'Tariff set name', zoneRates: 'Zone rates', officialPreset: 'Official preset', presetEnabled: 'Enabled', presetDisabled: 'Disabled', showPresetOnHome: 'Show preset on home screen', presetHiddenHint: 'This preset is disabled. Its rates are hidden from the home screen.', noHomeTariffs: 'No active tariffs', noHomeTariffsHint: 'Enable a preset or tariff in the tariffs screen.',
    deleteSet: 'Delete tariff set', gpsBillingPaused: 'Reconnecting GPS — billing is temporarily paused', paidTime: 'Charged time',
    routeMode: 'Route', sameZoneRoute: 'Within one zone', crossZoneRoute: 'Between zones',
    higherTariffTitle: 'Higher tariff', higherTariffBody: 'Tell the passenger about the new rate before switching.', applyTariff: 'Switch',
    startTariffTitle: 'Which tariff should be used?', startTariffBody: 'A different tariff is recommended for the current time or calendar.', selectedTariffLabel: 'Selected', recommendedTariffLabel: 'Recommended', keepSelectedTariff: 'Keep selected', useRecommendedTariff: 'Use recommended',
    periodSuggestionTitle: 'Tariff change due', periodSuggestionBody: 'The current time or calendar requires another tariff. Switch now?',
    tariffZone: 'Tariff zone', tariffPeriod: 'Period', zoneOne: 'Zone I', zoneTwo: 'Zone II',
    day: 'Day', nightHoliday: 'Night / holidays', zoneSwitchHint: 'Switch when the zone, time, or another tariff condition changes. Tell the passenger before applying a higher rate.',
    thankYou: 'Thank you for riding!', notFiscal: 'This is not a fiscal receipt',
    receiptError: 'Could not create the receipt. Please try again.',
    english: 'English', polish: 'Polski', locationTitle: 'Location access required',
    locationBody: 'Allow location access to calculate trip distance.', allow: 'Allow access',
    locationError: 'Could not access location. Check GPS and permission.',
    cannotDelete: 'The default tariff cannot be deleted', invalidForm: 'Could not save tariff',
    validationName: 'Enter a name for the tariff and each variant.', validationDuplicate: 'The tariff or its variants have duplicate names.', validationNumbers: 'Check the numeric fields. Only non-negative numbers are allowed.', validationPrice: 'Price per kilometre must be greater than zero.', validationMinimumFare: 'Minimum fare must be zero or at least the base fare.', validationSchedule: 'Enter different start and end times in the 00:00–23:59 format.',
    foregroundNote: 'GPS runs in the background — you can lock the screen.',
    backgroundPermissionTitle: 'Background tracking',
    backgroundPermissionBody: 'To calculate accurately while the screen is locked, allow location access “Always”. The system may open Settings.',
    backgroundPermissionDenied: 'Background access was not granted. Enable “Always” location access in system settings.',
    continue: 'Continue', trackingNotification: 'Ride in progress — distance and fare are being calculated.',
    readyStatus: 'READY', gpsStatus: 'GPS', fixedStatus: 'FIXED', pausedStatus: 'PAUSED',
  },
  pl: {
    appName: 'Taksometr', ready: 'Gotowy do kursu', chooseTariff: 'Wybierz taryfę i rozpocznij',
    start: 'Rozpocznij kurs', stop: 'Zakończ', pause: 'Pauza', resume: 'Wznów', distance: 'Dystans',
    fareMode: 'Sposób rozliczenia', meteredFare: 'Według taksometru', agreedFare: 'Cena umówiona',
    agreedFareHint: 'Ta kwota będzie główną ceną dla pasażera i na rachunku.', agreedFareAmount: 'Uzgodniona kwota', invalidAgreedFare: 'Wpisz uzgodnioną kwotę większą od zera.',
    pickupAddress: 'Adres odbioru', dropoffAddress: 'Adres docelowy', addressOptional: 'Opcjonalnie', useTaximeter: 'Włącz taksometr', useTaximeterHint: 'GPS osobno oblicza dystans i opłatę taryfową.', fixedPriceOnlyHint: 'Bez GPS i naliczania taryfy — tylko czas i cena umówiona.', fixedPriceRide: 'Kurs z ceną umówioną',
    ridePaused: 'Kurs został wstrzymany', finalSummary: 'Podsumowanie kursu', clientDiscount: 'Rabat dla pasażera', discountHint: 'Wybierz opcję lub przeciągnij suwak', discount: 'Rabat', finishAndReceipt: 'Zakończ i utwórz rachunek', continueRide: 'Pozostaw wstrzymany',
    discountPercentMode: 'Procentowo', finalPriceMode: 'Cena końcowa', finalPrice: 'Cena dla pasażera', finalPriceHint: 'Wpisz kwotę końcową, a dokładny rabat zostanie obliczony automatycznie.', invalidFinalPrice: 'Cena musi wynosić od zera do kwoty kursu.',
    decreasePrice: 'Zmniejsz cenę o jeden grosz', increasePrice: 'Zwiększ cenę o jeden grosz',
    time: 'Czas', waiting: 'Postój', currentFare: 'Aktualna cena', tariffs: 'Taryfy', history: 'Kursy',
    settings: 'Ustawienia', activeTariff: 'Aktywna taryfa', editTariffs: 'Zarządzaj taryfami',
    statistics: 'Statystyki', daily: 'Dzień', weekly: 'Tydzień', monthly: 'Miesiąc', earnings: 'Przychód', rides: 'Kursy', averageRide: 'Średni kurs', earningsChart: 'Zmiana przychodu', previousPeriod: 'Poprzedni okres', nextPeriod: 'Następny okres', vsPrevious: 'względem poprzedniego okresu', noComparison: 'Brak wcześniejszych danych do porównania', earningsPerHour: 'Na godzinę kursów', earningsPerKm: 'Przychód / km', periodTrips: 'Kursy w tym okresie', noTripsPeriod: 'Brak kursów w tym okresie',
    recentTrips: 'Ostatnie kursy', allTrips: 'Wszystkie kursy', noTrips: 'Brak kursów',
    noTripsHint: 'Zakończone kursy pojawią się tutaj.', addTariff: 'Nowa taryfa', editTariff: 'Edytuj taryfę',
    deleteTrip: 'Usuń kurs', deleteTripTitle: 'Usunąć ten kurs?',
    deleteTripBody: 'Historia kursu i rachunek zostaną trwale usunięte.',
    finishTripTitle: 'Zakończyć kurs?', finishTripBody: 'Naliczanie zostanie zatrzymane i powstanie rachunek końcowy.',
    deleteTariffTitle: 'Usunąć taryfę?', deleteTariffBody: 'Tej operacji nie można cofnąć. Zapisane kursy pozostaną bez zmian.',
    tariffName: 'Nazwa taryfy', baseFare: 'Opłata początkowa', includedKm: 'Km w cenie',
    pricePerKm: 'Cena za km', waitingRate: 'Postój / godz.', minimumFare: 'Cena minimalna',
    currency: 'Waluta', currencyCode: 'Kod waluty', addCurrency: 'Dodaj walutę', useCurrency: 'Użyj waluty', save: 'Zapisz', cancel: 'Anuluj', close: 'Zamknij', done: 'Gotowe', back: 'Wstecz', makeDefault: 'Ustaw jako domyślną',
    crossoverSpeed: 'Prędkość graniczna', crossoverAuto: 'Obliczana automatycznie z poniższych stawek', hourShort: 'godz.', crossoverHint: 'Poniżej tej prędkości naliczany jest czas. Przy tej prędkości i powyżej naliczany jest dystans. Nie trzeba ustawiać tej granicy osobno.',
    default: 'Domyślna', delete: 'Usuń', tripSummary: 'Podsumowanie kursu', total: 'Do zapłaty',
    shareReceipt: 'Udostępnij rachunek', newTrip: 'Nowy kurs', receipt: 'Rachunek',
    receiptNumber: 'Numer kursu', started: 'Początek', finished: 'Koniec', tariff: 'Taryfa',
    rideReceipt: 'RACHUNEK ZA KURS', baseCharge: 'Opłata początkowa', distanceCharge: 'Opłata za dystans',
    waitingCharge: 'Opłata za postój', minimumAdjustment: 'Dopłata do ceny minimalnej',
    includedAllowance: 'Wliczono w opłatę początkową',
    tariffType: 'Typ taryfy', singleTariff: 'Pojedyncza taryfa', zonedTariff: 'Zestaw strefowy',
    tariffSet: 'Zestaw taryf', tariffVariants: 'Warianty taryfy', addVariant: 'Dodaj wariant', removeVariant: 'Usuń wariant',
    tariffOverview: 'Twoje taryfy', tariffOverviewHint: 'Zarządzaj stawkami i wybierz, co ma być widoczne przed rozpoczęciem kursu.', rates: 'stawek', showOnHomeHint: 'Dostępna przed rozpoczęciem kursu', homeShort: 'Główna', tariffEditingLocked: 'Podczas aktywnego kursu edycja i zmiana taryfy domyślnej są niedostępne.',
    variantName: 'Nazwa wariantu', zoneOptional: 'Strefa (opcjonalnie)', schedule: 'Harmonogram', scheduleAlways: 'Zawsze', scheduleWeekday: 'Dni powszednie / dzień', scheduleNightHoliday: 'Noc / niedziele / święta', startsAt: 'Od', endsAt: 'Do',
    showOnHome: 'Pokaż na ekranie głównym', atLeastOneHomeTariff: 'Na ekranie głównym musi pozostać co najmniej jedna taryfa.', rideTariff: 'Taryfa kursu',
    groupName: 'Nazwa zestawu taryf', zoneRates: 'Stawki stref', officialPreset: 'Oficjalny zestaw', presetEnabled: 'Włączony', presetDisabled: 'Wyłączony', showPresetOnHome: 'Pokaż zestaw na ekranie głównym', presetHiddenHint: 'Zestaw jest wyłączony. Jego taryfy są ukryte na ekranie głównym.', noHomeTariffs: 'Brak aktywnych taryf', noHomeTariffsHint: 'Włącz zestaw lub taryfę na ekranie taryf.',
    deleteSet: 'Usuń zestaw taryf', gpsBillingPaused: 'Przywracanie GPS — naliczanie chwilowo wstrzymane', paidTime: 'Czas płatny',
    routeMode: 'Trasa', sameZoneRoute: 'W jednej strefie', crossZoneRoute: 'Między strefami',
    higherTariffTitle: 'Wyższa taryfa', higherTariffBody: 'Przed przełączeniem poinformuj pasażera o zmianie stawki.', applyTariff: 'Przełącz',
    startTariffTitle: 'Którą taryfę zastosować?', startTariffBody: 'Dla aktualnej pory lub kalendarza zalecana jest inna taryfa.', selectedTariffLabel: 'Wybrano', recommendedTariffLabel: 'Zalecana', keepSelectedTariff: 'Zostaw wybraną', useRecommendedTariff: 'Użyj zalecanej',
    periodSuggestionTitle: 'Czas zmienić taryfę', periodSuggestionBody: 'Według aktualnej godziny lub kalendarza powinna obowiązywać inna taryfa. Przełączyć teraz?',
    tariffZone: 'Strefa taryfowa', tariffPeriod: 'Pora', zoneOne: 'Strefa I', zoneTwo: 'Strefa II',
    day: 'Dzień', nightHoliday: 'Noc / święta', zoneSwitchHint: 'Przełącz taryfę po zmianie strefy, pory lub innego warunku. Przed zastosowaniem wyższej stawki poinformuj pasażera.',
    thankYou: 'Dziękujemy za kurs!', notFiscal: 'To nie jest paragon fiskalny',
    receiptError: 'Nie udało się utworzyć rachunku. Spróbuj ponownie.',
    language: 'Język', ukrainian: 'Українська', english: 'English', polish: 'Polski',
    receiptLanguage: 'Język rachunku',
    appearance: 'Wygląd', theme: 'Motyw', themeSystem: 'Systemowy', themeLight: 'Jasny', themeDark: 'Ciemny',
    activeRideDisplay: 'Aktywny kurs poza aplikacją', floatingOverlay: 'Pływający taksometr', floatingOverlayHint: 'Pokazuj cenę, czas, dystans i taryfę nad innymi aplikacjami.', floatingOverlayPermission: 'Wymagane jest systemowe zezwolenie „Wyświetlanie nad innymi aplikacjami”.',
    locationTitle: 'Wymagany dostęp do lokalizacji', locationBody: 'Zezwól na lokalizację, aby liczyć dystans.',
    allow: 'Zezwól', locationError: 'Nie można pobrać lokalizacji. Sprawdź GPS i uprawnienia.',
    cannotDelete: 'Nie można usunąć domyślnej taryfy', invalidForm: 'Nie udało się zapisać taryfy',
    validationName: 'Podaj nazwę taryfy i każdego wariantu.', validationDuplicate: 'Taryfa lub jej warianty mają takie same nazwy.', validationNumbers: 'Sprawdź pola liczbowe. Dozwolone są tylko liczby nieujemne.', validationPrice: 'Cena za kilometr musi być większa od zera.', validationMinimumFare: 'Cena minimalna musi wynosić zero lub być nie mniejsza od opłaty początkowej.', validationSchedule: 'Podaj różne godziny rozpoczęcia i zakończenia w formacie 00:00–23:59.',
    foregroundNote: 'GPS działa w tle — możesz zablokować ekran.',
    backgroundPermissionTitle: 'Śledzenie w tle',
    backgroundPermissionBody: 'Aby liczyć kurs po zablokowaniu ekranu, zezwól na lokalizację „Zawsze”. System może otworzyć Ustawienia.',
    backgroundPermissionDenied: 'Brak dostępu w tle. Włącz lokalizację „Zawsze” w ustawieniach systemowych.',
    continue: 'Kontynuuj', trackingNotification: 'Kurs trwa — dystans i cena są obliczane.',
    readyStatus: 'GOTOWY', gpsStatus: 'GPS', fixedStatus: 'UMÓWIONA', pausedStatus: 'PAUZA',
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
