// NuroTewedede - Frontend logic (talks to the Express + Supabase API)
// Ported from the React AI Studio prototype (App.tsx + components) into plain vanilla JS.

// ---------- State ----------
let pools = [];
let currentFilter = 'All';
let currentCategory = 'All';
let currentProduce = null;
let currentSearchQuery = '';
let currentSort = 'default';
let currentUser = null;
let authMode = 'signin';
let activeTab = 'pools';
let myReservations = [];
let toastTimer = null;

// Ethiopian towns (canonical names) for the town filter dropdowns,
// compiled from the expanded regional list of major cities & prominent towns.
const ETHIOPIAN_TOWNS = [
    'Addis Ababa', 'Adama', 'Adigrat', 'Adwa', 'Alamata', 'Ambo',
    'Arba Minch', 'Asaita', 'Asella', 'Assosa', 'Awash', 'Axum',
    'Bahir Dar', 'Bale Robe', 'Bedele', 'Bishoftu', 'Bonga', 'Burayu',
    'Debre Birhan', 'Debre Markos', 'Debre Sina', 'Debre Tabor', 'Degehabur',
    'Dessie', 'Dilla', 'Dire Dawa', 'Finote Selam', 'Gambela', 'Goba',
    'Gode', 'Gondar', 'Hawassa', 'Hossana', 'Jijiga', 'Jimma', 'Jinka',
    'Kebri Dahar', 'Kombolcha', 'Lalibela', 'Logiya', 'Mekelle', 'Metekel',
    'Metu', 'Mizan Teferi', 'Nekemte', 'Sawla', 'Semera', 'Shashemene',
    'Shire', 'Sululta', 'Waliso', 'Warder', 'Wolaita Sodo', 'Woldiya',
    'Worabe', 'Yirgalem'
];

let reserveState = { pool: null, shares: 1, payment: 'telebirr' };
let detailsState = { pool: null, comments: [] };

let calcQuantities = {};
let calcFamilySize = 4;
let selectedHubId = 'hub-addis';
let appLang = localStorage.getItem('nt-lang') || 'en';
if (!['en', 'am', 'om'].includes(appLang)) appLang = 'en';

// ---------- i18n (English / Amharic / Afaan Oromoo) ----------

const TOWN_L10N = {
    'Addis Ababa': { am: 'አዲስ አበባ', om: 'Finfinnee' },
    'Adama': { am: 'አዳማ', om: 'Adaamaa' },
    'Hawassa': { am: 'አዋሳ', om: 'Hawaasaa' },
    'Bahir Dar': { am: 'ባሕር ዳር', om: 'Baahirdaar' },
    'Jimma': { am: 'ጅማ', om: 'Jimmaa' },
    'Wolaita Sodo': { am: 'ወላይታ ሶዶ', om: 'Wolayita Sooddoo' },
    'Dire Dawa': { am: 'ድሬዳዋ', om: 'Dirre Dhawaa' },
    'Gondar': { am: 'ጎንደር', om: 'Gondar' },
    'Mekelle': { am: 'መቀሌ', om: 'Maqallaa' },
    'Dessie': { am: 'ደሴ', om: 'Dassie' },
    'Arba Minch': { am: 'አርባ ምንጭ', om: 'Arbaa Minch' },
    'Shashemene': { am: 'ሻሸመኔ', om: 'Shaashamannee' },
    'Jijiga': { am: 'ጅጅጋ', om: 'Jigjigaa' },
    'Nekemte': { am: 'ነቀምት', om: 'Naqamtee' },
    'Ambo': { am: 'አምቦ', om: 'Amboo' },
    'Waliso': { am: 'ዋሊሶ', om: 'Waliisoo' },
    'Bishoftu': { am: 'ቢሾፍቱ', om: 'Bishooftuu' },
    'Debre Birhan': { am: 'ደብረ ብርሃን', om: 'Debre Birhan' },
    'Debre Markos': { am: 'ደብረ ማርቆስ', om: 'Debre Markos' },
    'Debre Tabor': { am: 'ደብረ ታቦር', om: 'Debre Tabor' },
    'Kombolcha': { am: 'ኮምቦልቻ', om: 'Kombolchaa' },
    'Asella': { am: 'አሰላ', om: 'Asallaa' },
    'Goba': { am: 'ጎባ', om: 'Gobbaa' },
    'Dilla': { am: 'ዲላ', om: 'Diilaa' },
    'Bedele': { am: 'በደሌ', om: 'Beddellee' },
    'Metu': { am: 'ሜቱ', om: 'Mattu' },
    'Axum': { am: 'አክሱም', om: 'Aksum' },
    'Adigrat': { am: 'ዓዲግራት', om: 'Adigiraat' },
    'Lalibela': { am: 'ላሊበላ', om: 'Lalibalaa' },
    'Hossana': { am: 'ሆሳና', om: 'Hosaanaa' },
    'Gambela': { am: 'ጋምቤላ', om: 'Gambellaa' },
    'Assosa': { am: 'አሶሳ', om: 'Asosaa' },
    'Semera': { am: 'ሰመራ', om: 'Semeraa' },
    'Jinka': { am: 'ጂንካ', om: 'Jinkaa' },
    'Bonga': { am: 'ቦንጋ', om: 'Boongaa' },
    'Shire': { am: 'ሽሬ', om: 'Shiiree' },
    'Finote Selam': { am: 'ፍኖተ ሰላም', om: 'Finoote Salam' },
    'Sululta': { am: 'ሱሉልታ', om: 'Sulultaa' },
    'Burayu': { am: 'ቡራዩ', om: 'Buuraayyuu' },
    'Metekel': { am: 'መተከል', om: 'Mateekkel' },
    'Gode': { am: 'ጎዴ', om: 'Godee' },
    'Worabe': { am: 'ዎራቤ', om: 'Woraabee' },
    'Woldiya': { am: 'ወልድያ', om: 'Woldiyaa' },
    'Warder': { am: 'ዋርደር', om: 'Wardheer' },
    'Logiya': { am: 'ሎጊያ', om: 'Logiyyaa' },
    'Degehabur': { am: 'ደገሃቡር', om: 'Degehabur' },
    'Kebri Dahar': { am: 'ቀብሪ ደሃር', om: 'Qabri Dahar' },
    'Awash': { am: 'አዋሽ', om: 'Awaash' },
    'Adwa': { am: 'አድዋ', om: 'Adwaa' },
    'Alamata': { am: 'አላማታ', om: 'Alaamaataa' },
    'Sawla': { am: 'ሳውላ', om: 'Sawlaa' },
    'Yirgalem': { am: 'ይርጋለም', om: 'Yirgalem' },
    'Mizan Teferi': { am: 'ሚዛን ተፈሪ', om: 'Mizaan Teferii' },
    'Bale Robe': { am: 'ባሌ ሮቤ', om: 'Baale Roobee' },
    'Asaita': { am: 'አሳይታ', om: 'Asayitaa' },
    'Debre Sina': { am: 'ደብረ ሲና', om: 'Debre Siinaa' }
};

const CATEGORY_L10N = {
    'All': 'cat.all',
    'Grains & Teff': 'cat.grains',
    'Vegetables': 'cat.vegetables',
    'Coffee & Spices': 'cat.coffee',
    'Oil & Pulses': 'cat.oil',
    'Fruits': 'cat.fruits'
};

const PRODUCE_GROUPS = [
    {
        category: 'Grains & Teff',
        label: { en: 'Cereals & Grains', am: 'እህል እና ጥራጥሬ', om: 'Midhaanii' },
        items: [
            { id: 'teff', label: { en: 'Teff (White, Black, Mixed)', am: 'ጤፍ (ነጭ፣ ጥቁር፣ ድብልቅ)', om: 'Xaafii (Adii, Gurraacha, Makawaa)' }, keywords: ['teff', 'ጤፍ', 'xaafii'] },
            { id: 'wheat', label: { en: 'Wheat', am: 'ስንዴ', om: 'Qamadii' }, keywords: ['wheat', 'ስንዴ', 'qamadii', 'sindee'] },
            { id: 'barley', label: { en: 'Barley', am: 'ገብስ', om: 'Garbuu' }, keywords: ['barley', 'ገብስ', 'garbuu', 'gebs'] },
            { id: 'sorghum', label: { en: 'Sorghum', am: 'ማሽላ', om: 'Bishingaa' }, keywords: ['sorghum', 'ማሽላ', 'bishingaa', 'mashilla'] },
            { id: 'millet', label: { en: 'Millet', am: 'ደጉሳ', om: 'Daagussa' }, keywords: ['millet', 'ደጉሳ', 'daagussa'] }
        ]
    },
    {
        category: 'Oil & Pulses',
        label: { en: 'Legumes & Pulses', am: 'ጥራጥሬ እና ሙሉ ባቄላ', om: 'Huubuu fi Sanyii' },
        items: [
            { id: 'chickpeas', label: { en: 'Chickpeas (Shimbra)', am: 'ሽምብራ', om: 'Shimbraa' }, keywords: ['chickpea', 'shimbra', 'ሽምብራ', 'shimbraa'] },
            { id: 'lentils', label: { en: 'Lentils (Misir)', am: 'ምስር', om: 'Misiraa' }, keywords: ['lentil', 'misir', 'ምስር', 'misiraa'] },
            { id: 'fieldpeas', label: { en: 'Field Peas (Ater)', am: 'አተር', om: 'Ateraa' }, keywords: ['field pea', 'ater', 'አተር', 'ateraa'] },
            { id: 'favabeans', label: { en: 'Fava Beans (Bakela)', am: 'ባቄላ', om: 'Baqeelaa' }, keywords: ['fava', 'faba', 'bakela', 'ባቄላ', 'baqeelaa'] },
            { id: 'haricotbeans', label: { en: 'Haricot Beans', am: 'ቦሎቄ', om: 'Boqqolloo' }, keywords: ['haricot', 'ቦሎቄ', 'boqqolloo'] }
        ]
    },
    {
        category: 'Oil & Pulses',
        label: { en: 'Oilseeds', am: 'የዘይት ዘሮች', om: 'Sanyii Zayitaa' },
        items: [
            { id: 'sesame', label: { en: 'Sesame (Nech/Key)', am: 'ሰሊጥ (ነጭ/ቀይ)', om: 'Salitti (Adii/Dimaa)' }, keywords: ['sesame', 'ሰሊጥ', 'salitti', 'selit'] },
            { id: 'nug', label: { en: 'Niger Seed (Nug)', am: 'ኑግ', om: 'Nuugii' }, keywords: ['niger seed', 'nug', 'ኑግ', 'nuugii'] },
            { id: 'linseed', label: { en: 'Linseed (Telba)', am: 'ተልባ', om: 'Talbaa' }, keywords: ['linseed', 'telba', 'ተልባ', 'talbaa'] },
            { id: 'sunflower', label: { en: 'Sunflower', am: 'ሱፍ አበባ', om: 'Abaaboo Adii' }, keywords: ['sunflower', 'ሱፍ አበባ'] },
            { id: 'rapeseed', label: { en: 'Rapeseed', am: 'የራፕ ዘር', om: 'Sanyii Rapaa' }, keywords: ['rapeseed', 'የራፕ ዘር'] }
        ]
    },
    {
        category: 'Coffee & Spices',
        label: { en: 'Cash Crops & Stimulants', am: 'ቡና እና ቅመማ ቅመም', om: 'Buna fi Urgooftuu' },
        items: [
            { id: 'coffee', label: { en: 'Coffee', am: 'ቡና', om: 'Bunaa' }, keywords: ['coffee', 'ቡና', 'bunaa', 'buna'] },
            { id: 'spices', label: { en: 'Spices (Berbere, Korarima, Black Cumin, Fenugreek)', am: 'ቅመማ ቅመም (በርበሬ፣ ኮረሪማ፣ ጥቁር አዝሙድ፣ አብሶ)', om: 'Urgooftuu (Birberee, Korarimaa, Magazia, Huluugee)' }, keywords: ['spice', 'berbere', 'korarima', 'cumin', 'fenugreek', 'ቅመም', 'በርበሬ', 'ኮረሪማ'] }
        ]
    },
    {
        category: 'Vegetables',
        label: { en: 'Vegetables & Root Crops', am: 'አትክልቶች እና ስርወ ሰብሎች', om: 'Kuduraa fi Hidda' },
        items: [
            { id: 'onions', label: { en: 'Onions', am: 'ሽንኩርት', om: 'Shunkurtii' }, keywords: ['onion', 'ሽንኩርት', 'shunkurtii'] },
            { id: 'garlic', label: { en: 'Garlic', am: 'ነጭ ሽንኩርት', om: 'Qullubbii Adii' }, keywords: ['garlic', 'ነጭ ሽንኩርት'] },
            { id: 'potatoes', label: { en: 'Potatoes', am: 'ድንች', om: 'Dinchii' }, keywords: ['potato', 'ድንች', 'dinchii'] },
            { id: 'tomatoes', label: { en: 'Tomatoes', am: 'ቲማቲም', om: 'Timatimii' }, keywords: ['tomato', 'ቲማቲም', 'timatimii'] },
            { id: 'cabbage', label: { en: 'Cabbage', am: 'ጎመን', om: 'Goomeen' }, keywords: ['cabbage', 'ጎመን', 'goomeen'] }
        ]
    },
    {
        category: null,
        label: { en: 'Industrial & Bulk Goods', am: 'የኢንዱስትሪ እና የጅምላ እቃዎች', om: 'Meelaa Industriii fi Guddaa' },
        items: [
            { id: 'sugar', label: { en: 'Sugar', am: 'ስኳር', om: 'Sukkaaraa' }, keywords: ['sugar', 'ስኳር', 'sukkaaraa'] },
            { id: 'cookingoil', label: { en: 'Edible Cooking Oil', am: 'የምግብ ዘይት', om: 'Zayita Nyaataa' }, keywords: ['cooking oil', 'edible oil', 'ዘይት', 'zayita'] },
            { id: 'flour', label: { en: 'Flour', am: 'ዱቄት', om: 'Daakuu' }, keywords: ['flour', 'ዱቄት', 'daakuu'] }
        ]
    }
];

const I18N = {
    en: {
        'nav.pools': 'Active Pools', 'nav.calculator': 'Savings Calculator',
        'nav.hubs': 'Hub Map', 'nav.myshares': 'My Reserved Shares', 'nav.bulk': 'Bulk & Institutional',
        'nav.signin': 'Sign In', 'nav.signout': 'Sign Out', 'nav.launch': '+ Launch a Pool', 'nav.townHub': 'Town Hub:',
        'nav.menu': 'Menu', 'nav.home': 'Home', 'nav.service': 'Service', 'nav.about': 'About Us', 'nav.how': 'How it works',
        'ticker.label': 'Live Prices',
        'hero.title': 'Combat Food Inflation Together',
        'hero.subtitle': 'Connecting regional farming production directly to neighborhood distribution hubs in Ethiopia to secure bulk wholesale prices for local communities.',
        'hero.bulkHint': 'Cafés, schools, hotels & co-ops — 100+ kg monthly',
        'service.badge': 'What We Do',
        'service.title': "We're passionate about bringing communities together through group buying",
        'service.subtitle': 'NuroTewedede empowers neighborhoods across Ethiopia to access affordable produce, support local farmers, and build resilient food systems through collective purchasing power.',
        'service.card1Title': 'Combat Food Inflation',
        'service.card1Text': 'Pool orders together to unlock wholesale pricing directly from regional farming woredas and beat retail price hikes.',
        'service.card2Title': 'Support Ethiopian Farmers',
        'service.card2Text': 'Directly connect urban neighborhood distribution hubs to local agricultural producers for fair trade.',
        'service.card3Title': 'Seamless Group Logistics',
        'service.card3Text': 'Easily join active community buying pools or launch your own distribution hub in seconds.',
        'about.badge': 'About NuroTewedede',
        'about.title': 'NuroTewedede: A lifeline for farmers, a game-changer for buyers.',
        'about.text': "Built on the power of social commerce, NuroTewedede bridges regional farming woredas and urban neighborhoods to transform access to essential goods. We cut out exploitative middlemen, channeling wholesale pricing directly from producers to communities. For farmers, this means fair compensation and expanded market reach across Ethiopia's major hubs. For buyers, it means up to 35% savings on everyday staples while supporting the livelihoods of local producers. Together, we're building a more equitable and resilient food ecosystem.",
        'about.mockTeff': 'Teff (White Gojjam)',
        'about.mockGojjam': 'Gojjam Woreda',
        'about.mockOnion': 'Red Onion - 25kg',
        'about.mockCoffee': 'Sidamo Coffee - 10kg',
        'about.mockBarley': 'Barley Bulk - 40kg',
        'about.mockBadge': 'Regional Produce',
        'how.badge': 'How it works',
        'how.title': 'Add to your cart, leave the rest to us',
        'how.step1Title': 'Create a group or pool',
        'how.step1Text': 'Create a group or pool on NuroTewedede to unlock wholesale fair pricing.',
        'how.step2Title': 'Invite your community',
        'how.step2Text': 'Invite neighbors, friends, or family by sharing the product link.',
        'how.timeLeft': 'Time left:',
        'how.step3Title': 'Lock and save',
        'how.step3Text': 'Once the group reaches the required participant threshold, the bulk order from the regional woredas is locked and placed at a deep discount.',
        'how.statSourcing': 'Agricultural Sourcing',
        'how.statSourcingSub': 'Direct from regional woredas',
        'how.statLogistics': 'Local Logistics',
        'how.statLogisticsSub': 'Community hub delivery',
        'how.statGroupPooling': 'Group Pooling',
        'how.statGroupPoolingSub': 'Shared wholesale savings',
        'how.statDelivery': 'Community Delivery',
        'how.statDeliverySub': 'Fair trade to your door',
        'bulk.cta': '🏭 Bulk & Institutional Orders',
        'metric.savings': 'Avg Retail Savings', 'metric.woredas': 'Connected Woredas', 'metric.pools': 'Active Pools',
        'pools.title': 'Active Group Pools', 'pools.showing': 'Showing all pools', 'pools.allProducts': 'All Products',
        'pools.search': 'Search produce, category or woreda...', 'pools.sortBy': 'Sort By:',
        'pools.allTowns': 'All Towns / Hubs',
        'pools.sortDefault': 'Default', 'pools.sortSavings': 'Highest Savings %',
        'pools.sortPriceAsc': 'Price: Low to High', 'pools.sortPriceDesc': 'Price: High to Low',
        'pools.sortProgress': 'Funding Progress',
        'pools.showingCount': 'Showing {0} pool(s)', 'pools.searchResults': 'Showing {0} result(s) for "{1}"',
        'card.origin': 'Origin: {0}', 'card.pickup': 'Pickup: {0}', 'card.unit': 'Unit: {0}',
        'card.hub': '{0} Hub', 'card.groupPrice': 'Group Price', 'card.marketRetail': 'Market Retail',
        'card.saveUnit': 'Save {0} ETB / unit', 'card.savePct': 'Save {0}%',
        'card.reservation': 'Pool Reservation', 'card.shares': '{0} / {1} shares ({2}%)',
        'card.daysLeft': '{0} days left', 'card.lockingToday': 'Locking today', 'card.organizer': 'Organizer: {0}',
        'card.reserve': 'Reserve Share', 'card.fullyReserved': 'Pool Fully Reserved',
        'card.share': 'Share Pool', 'card.shareTitle': 'Share via', 'card.shareTelegram': 'Telegram',
        'card.shareWhatsapp': 'WhatsApp', 'card.copyLink': 'Copy Link', 'card.shareToast': 'Pool link copied to clipboard!',
        'card.countdownEnds': 'Ends in {0}', 'card.endsToday': 'Ends today',
        'card.calendar': 'Add Pickup Reminder to Calendar',
        'share.title': 'Share Pool', 'share.linkCopied': 'Pool link copied to clipboard!',
        'card.noPools': 'No group pools found matching your criteria.',
        'badge.ready': 'Ready for Pickup', 'badge.transit': 'In-Transit Highway',
        'badge.locked': 'Pool Locked', 'badge.active': 'Active Pool',
        'cat.all': 'All', 'cat.grains': 'Grains & Teff', 'cat.vegetables': 'Vegetables',
        'cat.coffee': 'Coffee & Spices', 'cat.oil': 'Oil & Pulses', 'cat.fruits': 'Fruits',
        'calc.badge': 'Interactive Inflation Fighter', 'calc.title': 'Neighborhood Family Savings Calculator',
        'calc.subtitle': 'Compare local retail market prices with NuroTewedede direct woreda wholesale group rates.',
        'calc.family': 'Family Size:', 'calc.people2': '2 People', 'calc.people4': '4 People',
        'calc.people6': '6 People', 'calc.people8': '8 People', 'calc.adjust': 'Adjust Monthly Produce Consumption',
        'calc.impact': 'Calculated Impact', 'calc.monthlySavings': 'Estimated Monthly Savings',
        'calc.savePercent': 'Save {0}% compared to market retail!', 'calc.retail': 'Local Retail Expense:',
        'calc.wholesale': 'NuroTewedede Group Cost:', 'calc.annual': 'Annual Household Savings:',
        'calc.note': 'By locking bulk orders with 10–20 neighborhood families, transport costs from farming woredas are divided equally, cutting out speculator markups.',
        'calc.chartTitle': 'Monthly Cost Comparison — Retail vs Group',
        'calc.chartRetail': 'Market Retail', 'calc.chartGroup': 'NuroTewedede Group',
        'calc.month': '{0} {1} / month', 'calc.groupRate': 'Group Rate: {0} ETB/unit',
        'calc.retailMarket': 'Retail Market: {0} ETB/unit', 'calc.saveItem': 'Save {0} ETB',
        'calc.unitsKg': 'kg', 'calc.unitsLitres': 'Litres',
        'hubs.badge': 'Woreda-to-Hub Supply Network', 'hubs.title': 'Ethiopian Direct Sourcing Map & Hub Locator',
        'hubs.subtitle': 'Track produce movement directly from farm cooperatives to neighborhood distribution points.',
        'hubs.select': 'Select Neighborhood Distribution Hub', 'hubs.activePools': '{0} Active Pools',
        'hubs.details': '{0} Details',
        'myshares.title': 'My Reserved Shares & Pickup Vouchers',
        'myshares.subtitle': 'Show these QR ticket vouchers to your neighborhood hub coordinator when picking up produce.',
        'myshares.empty': 'You haven\'t reserved any pool shares yet.',
        'myshares.browse': 'Browse Active Group Pools',
        'myshares.signinFirst': 'Sign in to view your reserved shares and pickup vouchers.',
        'myshares.shares': 'Shares: {0} unit(s)', 'myshares.method': 'Method: {0}',
        'myshares.voucherCode': 'Voucher Code', 'myshares.reservedOn': 'Reserved on: {0}',
        'myshares.hub': 'Hub: {0}', 'myshares.pickup': 'Pickup: {0}',
        'myshares.voucherBtn': 'Get Pickup Voucher',
        'myshares.voucher': 'Voucher Code: {0}', 'myshares.copy': 'Copy',
        'status.active': 'Active', 'status.ready': 'Ready for Pickup', 'status.collected': 'Collected',
        'reserve.badge': 'Reserve Share in Pool', 'reserve.direct': 'Direct from {0} to {1}',
        'reserve.selectShares': 'Select Shares ({0})', 'reserve.maxAvailable': 'Max available: {0}',
        'reserve.subtotal': 'Subtotal', 'reserve.retailCost': 'Retail market cost:',
        'reserve.youSave': 'You Save With Pool:', 'reserve.paymentMethod': 'Select Payment / Guarantee Method',
        'reserve.notice': 'Order notification will be sent to: {0}. Pickup location: {1} on {2}.',
        'reserve.confirm': 'Confirm Reservation ({0} ETB)', 'reserve.reserving': 'Reserving...',
        'pay.telebirr': 'TeleBirr', 'pay.cbe': 'CBE Birr', 'pay.cash': 'Pay at Hub',
        'success.title': 'Share Reservation Confirmed!',
        'success.subtitle': 'Your digital pickup voucher has been generated for {0}.',
        'success.ticketCode': 'Pickup Ticket Code', 'success.qty': 'Quantity: {0} x {1}',
        'success.hub': 'Hub: {0}', 'success.pickupDate': 'Pickup Date: {0}', 'success.method': 'Method: {0}',
        'success.done': 'Done', 'success.print': 'Print Voucher', 'success.copy': 'Copy Voucher Code',
        'success.copied': 'Voucher code copied!',
        'voucher.title': 'Pickup Voucher', 'voucher.customer': 'Customer', 'voucher.item': 'Item',
        'voucher.note': 'Show this voucher to the hub coordinator to collect your produce.',
        'details.noComments': 'No comments yet. Be the first neighbor to post a note!',
        'details.origin': 'Origin: {0}', 'details.unit': 'Unit: {0} • Pickup Hub: {1}',
        'details.progress': 'Progress ({0} / {1} shares)', 'details.percentReserved': '{0}% Reserved',
        'details.organizer': 'Organizer: {0}', 'details.reserve': 'Reserve Share',
        'details.board': 'Neighborhood Community Board ({0})', 'details.commentPh': 'Ask a question or post a note for the pool coordinator...',
        'details.post': 'Post', 'details.coordinator': 'Coordinator',
        'details.like': 'Like', 'details.liked': 'Liked', 'details.likeToast': 'Liked comment!', 'details.unlikeToast': 'Like removed.',
        'create.title': 'Launch a New Buying Pool', 'create.item': 'Item / Produce Name',
        'create.itemPh': 'e.g. Teff (White Gojjam) - 50kg', 'create.category': 'Category', 'create.town': 'Town / Hub',
        'create.woreda': 'Woreda Origin', 'create.woredaPh': 'e.g. Debre Markos', 'create.unit': 'Packaging Unit',
        'create.unitPh': 'e.g. 50 kg Bag', 'create.wholesale': 'Wholesale ETB', 'create.retail': 'Retail ETB',
        'create.retailPh': 'auto (45% markup)', 'create.target': 'Target Shares', 'create.hub': 'Pickup Hub Location',
        'create.hubPh': 'e.g. Bole Megenagna Hub #2', 'create.organizer': 'Organizer Name / Group Leader',
        'create.organizerPh': 'e.g. Abebe Tadesse (Kebele Coordinator)', 'create.submit': 'Create Pool',
        'auth.signin': 'Sign In', 'auth.signup': 'Create Account', 'auth.email': 'Email Address',
        'auth.emailPh': 'name@example.com', 'auth.password': 'Password', 'auth.passwordPh': '••••••••',
        'auth.name': 'Full Name', 'auth.namePh': 'Abebe Kebede',
        'auth.username': 'Username', 'auth.usernamePh': 'abebe123',
        'auth.emailOrUser': 'Email or Username', 'auth.emailOrUserPh': 'name@example.com or your username',
        'auth.nameRequired': 'Please enter your full name.',
        'auth.usernameRequired': 'Please choose a username.',
        'auth.checkEmail': 'Account created! Check your email to confirm your account, then sign in.',
        'auth.created': 'Account created successfully!',
        'auth.signedIn': 'Signed in successfully!',
        'bulk.title': 'Bulk & Institutional Purchase',
        'bulk.prodTeff': 'White Teff (Gojjam)', 'bulk.prodOnions': 'Red Onions (Ziway)', 'bulk.prodCoffee': 'Raw Coffee Beans (Sidama)', 'bulk.prodOil': 'Sunflower Cooking Oil', 'bulk.prodLentils': 'Red Lentils (Misir)',
        'bulk.retailTag': 'retail',
        'bulk.subtitle': 'For cafés, restaurants, schools, hotels & co-ops ordering 100+ kg per month. We connect you directly to the regional woreda supply network.',
        'bulk.business': 'Business / Institution Name', 'bulk.businessPh': 'e.g. Selam Café & Restaurant',
        'bulk.contact': 'Contact Person', 'bulk.contactPh': 'e.g. Tigist Alemu',
        'bulk.phone': 'Phone / WhatsApp', 'bulk.phonePh': '09 12 345 678',
        'bulk.volume': 'Monthly Volume (quintals)', 'bulk.volumePh': 'e.g. 5',
        'bulk.destination': 'Destination Hub', 'bulk.produce': 'Primary Produce Needed',
        'bulk.producePh': 'e.g. Teff, Red Onion, Cooking Oil', 'bulk.notes': 'Special Notes (optional)',
        'bulk.submit': 'Submit Bulk Inquiry', 'bulk.successTitle': 'Bulk Inquiry Received!',
        'bulk.successText': 'Our woreda sourcing team will contact you within 24 hours to confirm pricing, volume discounts and delivery schedule.',
        'bulk.ref': 'Reference:', 'bulk.done': 'Done',
        'bulk.summaryValue': 'Est. monthly order value: {0} ETB',
        'bulk.summarySavings': 'Est. savings vs retail (~{0}%)',
        'bulk.validation': 'Please fill in all required fields.',
        'bulk.required': 'Please fill in all required fields.', 'bulk.produceDefault': 'Choose a produce',
        'bulk.estQty': 'Estimated Quantity', 'bulk.estWholesale': 'Est. group wholesale',
        'bulk.estRetail': 'Est. retail value', 'bulk.estSave': 'Estimated Savings',
        'bulk.disclaimer': 'Estimate only — final quote confirmed by our woreda sourcing team.',
        'common.cancel': 'Cancel',
        'ai.subtitle': 'Direct Woreda Sourcing, Storage Guidelines, & Group Buying Calculations',
        'ai.placeholder': 'Ask AI about bulk produce quantities, Gojjam Teff prices, or storage tips...',
        'ai.processing': 'NuroTewedede AI is processing woreda supply data...',
        'ai.chip1': 'How do we plan a 20-family Teff & Spice group order for Addis Ababa?',
        'ai.chip2': 'What are the best storage tips for 50kg red onions to prevent rotting?',
        'ai.chip3': 'When is peak harvest season for Gojjam White Teff and price trends?',
        'ai.chip4': 'Suggest a bulk grocery supply list for a 30-person holiday feast',
        'ai.welcome': 'Hello! I am **NuroTewedede AI**, your direct agricultural sourcing and group-buying advisor for Ethiopian neighborhood hubs.\n\nI can assist you with:\n- **Bulk Supply Estimates:** Calculating Teff, Onions, Coffee, Oil, or Pulse quantities for 5 to 50 families.\n- **Harvest & Price Seasonality:** Finding peak harvest months in Gojjam, Sidama, Ziway, Arsi, and Jimma.\n- **Produce Storage Guidelines:** Keeping bulk 50kg bags fresh without spoilage.\n- **Holiday Feast Planning:** Scaling bulk grocery orders for community celebrations (Enkutatash, Genna, Timkat, Eid).\n\nSelect a quick topic below or type your question!',
        'footer.tagline': '© 2026 NuroTewedede Direct Sourcing Platform • Neighborhood Group Buying Network',
        'toast.copied': 'Voucher code copied!',
        'toast.reserved': 'Successfully reserved {0} share(s)! Digital pickup voucher generated.',
        'toast.bulkSubmitted': 'Bulk inquiry {0} submitted! Our woreda sourcing team will contact you within 24 hours.',
        'brand.tagline': 'Neighborhood Group Buying Platform',
        'meta.title': 'NuroTewedede : Neighborhood Group Buying Platform',
        'meta.description': 'Ethiopian neighborhood group buying platform: lock wholesale prices with your neighbors, reserve shares and track pickup vouchers.',
        'aria.toggleMenu': 'Toggle menu', 'aria.toggleTheme': 'Toggle dark mode', 'aria.selectLang': 'Select language',
        'aria.ticker': 'Live wholesale price ticker', 'aria.openAi': 'Open NuroAI Assistant', 'aria.closeAi': 'Close NuroAI Assistant',
        'aria.closeModal': 'Close modal', 'aria.close': 'Close', 'aria.backToTop': 'Back to top',
        'calc.year': '/ year',
        'calc.item1': 'White Teff (Gojjam)', 'calc.item2': 'Red Onions (Ziway)', 'calc.item3': 'Raw Coffee Beans (Sidama)',
        'calc.item4': 'Sunflower Cooking Oil (Litre)', 'calc.item5': 'Red Lentils (Misir)',
        'hubs.live': 'Live Corridor Tracking: Ethiopia', 'hubs.hubLabel': 'Hub:',
        'hubs.sourcingUnions': 'Primary Sourcing Unions:', 'hubs.address': 'Hub Address:', 'hubs.directLinks': 'Direct Woreda Links:',
        'ai.title': 'NuroAI Assistant', 'ai.badgeYou': 'YOU', 'ai.badgeAi': 'AI',
        'ai.noResponse': 'No response received.', 'ai.error': 'Unable to connect to Gemini AI Assistant',
        'ai.prompt1': 'How do we plan a 20-family Teff & Spice group order for Addis Ababa?',
        'ai.prompt2': 'What are the best storage tips for 50kg red onions to prevent rotting?',
        'ai.prompt3': 'When is peak harvest season for Gojjam White Teff and price trends?',
        'ai.prompt4': 'Suggest a bulk grocery supply list for a 30-person holiday feast',
        'time.justNow': 'Just now', 'time.today': 'Today', 'time.d': 'd', 'time.h': 'h',
        'err.serverUnreachable': 'Cannot reach the server. Make sure the backend is running (npm start in the project folder).',
        'err.htmlInsteadJson': 'Server answered with HTML instead of JSON', 'err.requestFailed': 'Request failed',
        'toast.signinReserve': 'Please sign in first to reserve a share.',
        'toast.poolFullyReserved': 'This pool is already fully reserved.',
        'toast.signinComment': 'Please sign in first to post a comment.',
        'toast.commentPosted': 'Comment posted to the community board.',
        'toast.signinLike': 'Please sign in first to like a comment.',
        'toast.signinLaunch': 'Please sign in first to launch a pool.',
        'toast.poolLaunched': 'New group-buying pool launched successfully!',
        'toast.poolCreateError': 'Error creating pool', 'toast.signedOut': 'Signed out successfully.',
        'pool.fallbackTitle': 'Community Buying Pool', 'pool.fallbackWoreda': 'Regional Woreda',
        'pool.fallbackUnit': '1 Share', 'pool.fallbackOrganizer': 'Neighborhood Group Coordinator',
        'pool.fallbackPickup': 'This Week', 'pool.fallbackCategory': 'Groceries',
        'pool.fallbackHubSuffix': 'Neighborhood Distribution Hub', 'pool.fallbackGroupPool': 'Group Pool',
        'pool.fallbackBag': '50 kg Bag',
        'details.neighborBuyer': 'Neighbor Buyer', 'details.title': 'Community Discussion & Details',
        'myshares.signinBtn': 'Sign In', 'myshares.emptyTitle': 'You haven\'t reserved any pool shares yet.',
        'myshares.viewVoucher': 'View Voucher',
        'bulk.notesPh': 'e.g. Special delivery instructions, quality preferences, or preferred contact time.',
        'voucher.qrAlt': 'QR voucher'
    },
    am: {
        'nav.pools': 'ንቁ ግዢዎች', 'nav.calculator': 'የቁጠባ ካልኩሌተር',
        'nav.hubs': 'የማዕከላት ካርታ', 'nav.myshares': 'የእኔ የተያዙ አክሲዮኖች', 'nav.bulk': 'የጅምላ እና ተቋማዊ',
        'nav.signin': 'ግባ', 'nav.signout': 'ውጣ', 'nav.launch': '+ ግዢ ጀምር', 'nav.townHub': 'የከተማ ማዕከል:',
        'nav.menu': 'ምናሌ', 'nav.home': 'መነሻ', 'nav.service': 'አገልግሎቶች', 'nav.about': 'ስለ እኛ', 'nav.how': 'እንዴት እንደሚሰራ',
        'ticker.label': 'የቀጥታ ዋጋዎች',
        'hero.title': 'የምግብ ዋጋ ንረትን አብረን እንዋጋ',
        'hero.subtitle': 'የክልል እርሻ ምርቶችን በቀጥታ ለአካባቢው የስርጭት ማዕከላት በማገናኘት ለማህበረሰቡ የጅምላ ዋጋ ማስጠበቅ',
        'hero.bulkHint': 'ካፌዎች፣ ትምህርት ቤቶች፣ ሆቴሎች እና ትብብሮች — በወር 100+ ኪግ',
        'service.badge': 'ምን እናደርጋለን',
        'service.title': 'ማህበረሰቦችን በቡድን ግዢ አብረን ማሰባሰብ በጣም እንወዳለን',
        'service.subtitle': 'NuroTewedede በመላ ኢትዮጵያ ማህበረሰቦች ተመጣጣኝ ምርት እንዲያገኙ፣ የአካባቢ ገበሬዎችን እንዲደግፉ እና ጠንካራ የምግብ ስርዓት እንዲገነቡ በጋራ የግዢ አቅም ያበረታታል።',
        'service.card1Title': 'የምግብ ዋጋ ንረትን መዋጋት',
        'service.card1Text': 'ትዕዛዞችን በአንድነት በመሰብሰብ በቀጥታ ከግብርና ወረዳዎች የጅምላ ዋጋ በማግኘት የችርቻሮ ዋጋ ጭማሪዎችን ያሸንፉ።',
        'service.card2Title': 'የኢትዮጵያ ገበሬዎችን መደገፍ',
        'service.card2Text': 'የከተማ የስርጭት ማዕከላትን ከአካባቢው የእርሻ አምራቾች ጋር በቀጥታ በማገናኘት ፍትሃዊ ንግድ ለማድረግ።',
        'service.card3Title': 'ቀልጣፋ የቡድን ሎጂስቲክስ',
        'service.card3Text': 'በቀላሉ ንቁ የማህበረሰብ ግዢ ቡድኖችን ይቀላቀሉ ወይም በሰከንዶች ውስጥ የራስዎን ማዕከል ይክፈቱ።',
        'about.badge': 'ስለ NuroTewedede',
        'about.title': 'NuroTewedede: ለገበሬዎች የህይወት መስመር፣ ለገዢዎች ለውጥ አምጪ',
        'about.text': 'በማህበራዊ ንግድ ኃይል ላይ የተገነባው NuroTewedede፣ የክልል የእርሻ ወረዳዎችን እና የከተማ ሰፈሮችን በማገናኘት የመሠረታዊ እቃዎች ተደራሽነትን ይለውጣል። ገዢዎችን የሚበዘብዙ አስታራቂዎችን በማስወገድ የጅምላ ዋጋን በቀጥታ ከአምራቾች ወደ ማህበረሰብ ያመጣል። ለገበሬዎች ፍትሃዊ ክፍያ እና በኢትዮጵያ ዋና ዋና ማዕከላት ሰፊ የገበያ ተደራሽነት ማለት ነው። ለገዢዎች ደግሞ የአካባቢ አምራቾችን ኑሮ እየደገፉ እስከ 35% ቁጠባ ማለት ነው። አብረን የበለጠ ፍትሃዊ እና ጠንካራ የምግብ ስርዓት እንገነባለን።',
        'about.mockTeff': 'ጤፍ (ነጭ ጎጃም)',
        'about.mockGojjam': 'የጎጃም ወረዳ',
        'about.mockOnion': 'ቀይ ሽንኩርት - 25ኪግ',
        'about.mockCoffee': 'የሲዳሞ ቡና - 10ኪግ',
        'about.mockBarley': 'የገብስ ጅምላ - 40ኪግ',
        'about.mockBadge': 'የክልል ምርት',
        'how.badge': 'እንዴት እንደሚሰራ',
        'how.title': 'ወደ ጋሪዎ ይጨምሩ፣ ቀሪውን ለእኛ ይተዉ',
        'how.step1Title': 'ቡድን ወይም ግዢ ይፍጠሩ',
        'how.step1Text': 'ፍትሃዊ የጅምላ ዋጋ ለማግኘት በNuroTewedede ላይ ቡድን ወይም ግዢ ይፍጠሩ።',
        'how.step2Title': 'ማህበረሰብዎን ይጋብዙ',
        'how.step2Text': 'የምርት አገናኝን በማጋራት ጎረቤቶችን፣ ጓደኞችን ወይም ቤተሰብን ይጋብዙ።',
        'how.timeLeft': 'የቀረ ጊዜ:',
        'how.step3Title': 'ቆልፈው ይቆጥቡ',
        'how.step3Text': 'ቡድኑ የሚፈለገውን የተሳታፊ ቁጥር ሲደርስ፣ ከክልል ወረዳዎች የተጠየቀው ጅምላ ትዕዛዝ ተቆልፎ በከፍተኛ ቅናሽ ይቀመጣል።',
        'how.statSourcing': 'የግብርና አቅርቦት',
        'how.statSourcingSub': 'በቀጥታ ከክልል ወረዳዎች',
        'how.statLogistics': 'የአካባቢ ሎጂስቲክስ',
        'how.statLogisticsSub': 'የማህበረሰብ ማዕከል መላኪያ',
        'how.statGroupPooling': 'የቡድን ግዢ',
        'how.statGroupPoolingSub': 'የጋራ የጅምላ ቁጠባ',
        'how.statDelivery': 'የማህበረሰብ መላኪያ',
        'how.statDeliverySub': 'ፍትሃዊ ንግድ እስከ ቤትዎ',
        'bulk.cta': '🏭 የጅምላ እና ተቋማዊ ትዕዛዞች',
        'metric.savings': 'አማካይ የችርቻሮ ቁጠባ', 'metric.woredas': 'የተገናኙ ወረዳዎች', 'metric.pools': 'ንቁ ግዢዎች',
        'pools.title': 'ንቁ የቡድን ግዢዎች', 'pools.showing': 'ሁሉንም ግዢዎች በማሳየት ላይ', 'pools.allProducts': 'ሁሉም ምርቶች',
        'pools.search': 'ምርት፣ ምድብ ወይም ወረዳ ይፈልጉ...', 'pools.sortBy': 'ቅደም ተከተል:',
        'pools.allTowns': 'ሁሉም ከተሞች / ማዕከሎች',
        'pools.sortDefault': 'ነባሪ', 'pools.sortSavings': 'ከፍተኛ ቁጠባ %',
        'pools.sortPriceAsc': 'ዋጋ: ዝቅተኛ ወደ ከፍተኛ', 'pools.sortPriceDesc': 'ዋጋ: ከፍተኛ ወደ ዝቅተኛ',
        'pools.sortProgress': 'የገንዘብ እድገት',
        'pools.showingCount': '{0} ግዢ(ዎች) በማሳየት ላይ', 'pools.searchResults': 'ለ"{1}" {0} ውጤት(ቶች) በማሳየት ላይ',
        'card.origin': 'መነሻ: {0}', 'card.pickup': 'መቀበያ: {0}', 'card.unit': 'ክፍል: {0}',
        'card.hub': '{0} ማዕከል', 'card.groupPrice': 'የቡድን ዋጋ', 'card.marketRetail': 'የገበያ ችርቻሮ',
        'card.saveUnit': '{0} ብር / ክፍል ይቆጥቡ', 'card.savePct': '{0}% ይቆጥቡ',
        'card.reservation': 'የግዢ ቅድመ ትዕዛዝ', 'card.shares': '{0} / {1} አክሲዮኖች ({2}%)',
        'card.daysLeft': '{0} ቀናት ቀርተዋል', 'card.lockingToday': 'ዛሬ ይቆለፋል', 'card.organizer': 'አዘጋጅ: {0}',
        'card.reserve': 'ቦታ ያዙ', 'card.fullyReserved': 'ግዢው ሙሉ በሙሉ ተይዟል',
        'card.share': 'ግዢ ያጋሩ', 'card.shareTitle': 'በዚህ ያጋሩ', 'card.shareTelegram': 'ቴሌግራም',
        'card.shareWhatsapp': 'ዋትስአፕ', 'card.copyLink': 'ሊንክ ይቅዱ', 'card.shareToast': 'የግዢ ሊንክ በቅንብር ቦርድ ተቀድቷል!',
        'card.countdownEnds': 'የሚያበቃው በ{0}', 'card.endsToday': 'ዛሬ ያበቃል',
        'card.calendar': 'የመቀበያ ማስታወሻን ወደ ካሌንደር ያክሉ',
        'share.title': 'ግዢ ያጋሩ', 'share.linkCopied': 'የግዢ ሊንክ በቅንብር ቦርድ ተቀድቷል!',
        'card.noPools': 'ከመስፈርቶችዎ ጋር የሚስማማ የቡድን ግዢ አልተገኘም።',
        'badge.ready': 'ለመቀበል ዝግጁ', 'badge.transit': 'በመስመር ላይ',
        'badge.locked': 'ግዢ ተቆልፏል', 'badge.active': 'ንቁ ግዢ',
        'cat.all': 'ሁሉም', 'cat.grains': 'እህል እና ጤፍ', 'cat.vegetables': 'አትክልቶች',
        'cat.coffee': 'ቡና እና ቅመማ ቅመም', 'cat.oil': 'ዘይት እና ጥራጥሬ', 'cat.fruits': 'ፍራፍሬ',
        'calc.badge': 'በይነተገናኝ የዋጋ ንረት ተዋጊ', 'calc.title': 'የሰፈር ቤተሰብ ቁጠባ ካልኩሌተር',
        'calc.subtitle': 'የአካባቢውን የችርቻሮ ዋጋ ከNuroTewedede ቀጥተኛ የወረዳ የጅምላ ቡድን ዋጋ ጋር ያወዳድሩ።',
        'calc.family': 'የቤተሰብ ብዛት:', 'calc.people2': '2 ሰዎች', 'calc.people4': '4 ሰዎች',
        'calc.people6': '6 ሰዎች', 'calc.people8': '8 ሰዎች', 'calc.adjust': 'ወርሃዊ የምርት ፍጆታን ያስተካክሉ',
        'calc.impact': 'የተሰላ ተፅዕኖ', 'calc.monthlySavings': 'ግምታዊ ወርሃዊ ቁጠባ',
        'calc.savePercent': 'ከገበያ ችርቻሮ ጋር ሲነጻጸር {0}% ቆጥበው!', 'calc.retail': 'የአካባቢ ችርቻሮ ወጪ:',
        'calc.wholesale': 'የNuroTewedede ቡድን ወጪ:', 'calc.annual': 'ዓመታዊ የቤተሰብ ቁጠባ:',
        'calc.note': 'በ10–20 የሰፈር ቤተሰቦች የጅምላ ትዕዛዞችን በማስቆል የመጓጓዣ ወጪ በእኩል ይከፈላል፣ አስታራቂ ጭማሪዎችን ያስወግዳል።',
        'calc.chartTitle': 'ወርሃዊ የወጪ ንጽጽር — ችርቻሮ vs ቡድን',
        'calc.chartRetail': 'የገበያ ችርቻሮ', 'calc.chartGroup': 'የNuroTewedede ቡድን',
        'calc.month': '{0} {1} / በወር', 'calc.groupRate': 'የቡድን ዋጋ: {0} ብር/ክፍል',
        'calc.retailMarket': 'የገበያ ችርቻሮ: {0} ብር/ክፍል', 'calc.saveItem': '{0} ብር ይቆጥቡ',
        'calc.unitsKg': 'ኪግ', 'calc.unitsLitres': 'ሊትር',
        'hubs.badge': 'ወረዳ-ወደ-ማዕከል አቅርቦት መረብ', 'hubs.title': 'የኢትዮጵያ ቀጥተኛ አቅርቦት ካርታ እና የማዕከል አግኝ',
        'hubs.subtitle': 'የምርት እንቅስቃሴን ከእርሻ ህብረት ስራ ማህበራት እስከ ሰፈር ስርጭት ቦታዎች ይከታተሉ።',
        'hubs.select': 'የሰፈር ስርጭት ማዕከል ይምረጡ', 'hubs.activePools': '{0} ንቁ ግዢዎች',
        'hubs.details': 'የ{0} ዝርዝሮች',
        'myshares.title': 'የእኔ የተያዙ አክሲዮኖች እና የመቀበያ ቫውቸሮች',
        'myshares.subtitle': 'ምርት ሲቀበሉ እነዚህን የQR ቲኬት ቫውቸሮች ለሰፈር ማዕከል አስተባባሪ ያቅርቡ።',
        'myshares.empty': 'እስካሁን የቡድን ግዢ አክሲዮን አላስያዙም።',
        'myshares.browse': 'ንቁ የቡድን ግዢዎችን ይመልከቱ',
        'myshares.signinFirst': 'የእርስዎን የተያዙ አክሲዮኖች እና የመቀበያ ቫውቸሮች ለማየት ይግቡ።',
        'myshares.shares': 'አክሲዮኖች: {0} ክፍል(ዎች)', 'myshares.method': 'ዘዴ: {0}',
        'myshares.voucherCode': 'የቫውቸር ኮድ', 'myshares.reservedOn': 'የተያዘበት: {0}',
        'myshares.hub': 'ማዕከል: {0}', 'myshares.pickup': 'መቀበያ: {0}',
        'myshares.voucherBtn': 'የመቀበያ ቫውቸር አግኙ',
        'myshares.voucher': 'የቫውቸር ኮድ: {0}', 'myshares.copy': 'ቅዳ',
        'status.active': 'ንቁ', 'status.ready': 'ለመቀበል ዝግጁ', 'status.collected': 'ተቀብለዋል',
        'reserve.badge': 'በግዢ ውስጥ ቦታ ያዙ', 'reserve.direct': 'በቀጥታ ከ{0} ወደ {1}',
        'reserve.selectShares': 'አክሲዮኖችን ይምረጡ ({0})', 'reserve.maxAvailable': 'ከፍተኛ የሚገኘው: {0}',
        'reserve.subtotal': 'ድምር', 'reserve.retailCost': 'የገበያ ችርቻሮ ዋጋ:',
        'reserve.youSave': 'በቡድኑ የሚቆጥቡት:', 'reserve.paymentMethod': 'የክፍያ / ዋስትና ዘዴ ይምረጡ',
        'reserve.notice': 'የትዕዛዝ ማስታወቂያ ወደ {0} ይላካል። መቀበያ ቦታ: {1} በ{2}።',
        'reserve.confirm': 'ምዝገባ ያረጋግጡ ({0} ብር)', 'reserve.reserving': 'በማስያዝ ላይ...',
        'pay.telebirr': 'TeleBirr', 'pay.cbe': 'CBE ብር', 'pay.cash': 'በማዕከሉ ይክፈሉ',
        'success.title': 'የአክሲዮን ምዝገባ ተረጋግጧል!',
        'success.subtitle': 'የእርስዎ ዲጂታል የመቀበያ ቫውቸር ለ{0} ተዘጋጅቷል።',
        'success.ticketCode': 'የመቀበያ ቲኬት ኮድ', 'success.qty': 'ብዛት: {0} x {1}',
        'success.hub': 'ማዕከል: {0}', 'success.pickupDate': 'የመቀበያ ቀን: {0}', 'success.method': 'ዘዴ: {0}',
        'success.done': 'ተጠናቋል', 'success.print': 'ቫውቸሩን ያትሙ', 'success.copy': 'የቫውቸር ኮድ ይቅዱ',
        'success.copied': 'የቫውቸር ኮድ ተቀድቷል!',
        'voucher.title': 'የመቀበያ ቫውቸር', 'voucher.customer': 'ደንበኛ', 'voucher.item': 'እቃ',
        'voucher.note': 'ምርትዎን ለመቀበል ይህን ቫውቸር ለማዕከል አስተባባሪ ያቅርቡ።',
        'details.noComments': 'እስካሁን አስተያየት የለም። የመጀመሪያው ጎረቤት ይሁኑ እና ማስታወሻ ይለጥፉ!',
        'details.origin': 'መነሻ: {0}', 'details.unit': 'ክፍል: {0} • መቀበያ ማዕከል: {1}',
        'details.progress': 'እድገት ({0} / {1} አክሲዮኖች)', 'details.percentReserved': '{0}% ተይዟል',
        'details.organizer': 'አዘጋጅ: {0}', 'details.reserve': 'ቦታ ያዙ',
        'details.board': 'የሰፈር ማህበረሰብ መግለጫ ሰሌዳ ({0})', 'details.commentPh': 'ጥያቄ ይጠይቁ ወይም ለግዢ አስተባባሪ ማስታወሻ ይለጥፉ...',
        'details.post': 'ለጥፍ', 'details.coordinator': 'አስተባባሪ',
        'details.like': 'እወዳለሁ', 'details.liked': 'ወድጄዋለሁ', 'details.likeToast': 'አስተያየት ተወድዷል!', 'details.unlikeToast': 'እወዳለሁ ተወግዷል።',
        'create.title': 'አዲስ የግዢ ቡድን ይጀምሩ', 'create.item': 'እቃ / የምርት ስም',
        'create.itemPh': 'ለምሳሌ ጤፍ (ነጭ ጎጃም) - 50ኪግ', 'create.category': 'ምድብ', 'create.town': 'ከተማ / ማዕከል',
        'create.woreda': 'የወረዳ መነሻ', 'create.woredaPh': 'ለምሳሌ ደብረ ማርቆስ', 'create.unit': 'የማሸጊያ ክፍል',
        'create.unitPh': 'ለምሳሌ 50ኪግ ቦርሳ', 'create.wholesale': 'የጅምላ ዋጋ (ብር)', 'create.retail': 'የችርቻሮ ዋጋ (ብር)',
        'create.retailPh': 'አውቶ (45% ጭማሪ)', 'create.target': 'ዒላማ አክሲዮኖች', 'create.hub': 'የመቀበያ ማዕከል ቦታ',
        'create.hubPh': 'ለምሳሌ ቦሌ መገናኛ ማዕከል #2', 'create.organizer': 'የአዘጋጅ ስም / የቡድን መሪ',
        'create.organizerPh': 'ለምሳሌ አበበ ታደሰ (የቀበሌ አስተባባሪ)', 'create.submit': 'ግዢ ይፍጠሩ',
        'auth.signin': 'ግባ', 'auth.signup': 'መለያ ይፍጠሩ', 'auth.email': 'ኢሜይል አድራሻ',
        'auth.emailPh': 'name@example.com', 'auth.password': 'የይለፍ ቃል', 'auth.passwordPh': '••••••••',
        'auth.name': 'ሙሉ ስም', 'auth.namePh': 'አበበ ከበደ',
        'auth.username': 'የተጠቃሚ ስም', 'auth.usernamePh': 'abebe123',
        'auth.emailOrUser': 'ኢሜይል ወይም የተጠቃሚ ስም', 'auth.emailOrUserPh': 'name@example.com ወይም የተጠቃሚ ስምዎ',
        'auth.nameRequired': 'እባክዎ ሙሉ ስምዎን ያስገቡ።',
        'auth.usernameRequired': 'እባክዎ የተጠቃሚ ስም ይምረጡ።',
        'auth.checkEmail': 'መለያ ተፈጥሯል! መለያዎን ለማረጋገጥ ኢሜይልዎን ይመልከቱ፣ ከዚያ ይግቡ።',
        'auth.created': 'መለያ በተሳካ ሁኔታ ተፈጥሯል!',
        'auth.signedIn': 'በተሳካ ሁኔታ ገብተዋል!',
        'bulk.title': 'የጅምላ እና ተቋማዊ ግዢ',
        'bulk.prodTeff': 'ነጭ ጤፍ (ጎጃም)', 'bulk.prodOnions': 'ቀይ ሽንኩርት (ዝዌይ)', 'bulk.prodCoffee': 'ድፍድፍ የቡና ፍሬ (ሲዳማ)', 'bulk.prodOil': 'የሱፍ አበባ የምግብ ዘይት', 'bulk.prodLentils': 'ቀይ ምስር',
        'bulk.retailTag': 'ችርቻሮ',
        'bulk.subtitle': 'ወርሃዊ 100+ ኪግ ለሚያዝዙ ካፌዎች፣ ምግብ ቤቶች፣ ትምህርት ቤቶች፣ ሆቴሎች እና ትብብሮች። በቀጥታ ከክልል የወረዳ አቅርቦት መረብ እናገናኝዎታለን።',
        'bulk.business': 'የንግድ / ተቋም ስም', 'bulk.businessPh': 'ለምሳሌ ሰላም ካፌ እና ምግብ ቤት',
        'bulk.contact': 'የመገናኛ ሰው', 'bulk.contactPh': 'ለምሳሌ ትግስት አለሙ',
        'bulk.phone': 'ስልክ / ዋትስአፕ', 'bulk.phonePh': '09 12 345 678',
        'bulk.volume': 'ወርሃዊ መጠን (ኩንታል)', 'bulk.volumePh': 'ለምሳሌ 5',
        'bulk.destination': 'የመድረሻ ማዕከል', 'bulk.produce': 'የሚያስፈልግ ዋና ምርት',
        'bulk.producePh': 'ለምሳሌ ጤፍ፣ ቀይ ሽንኩርት፣ የምግብ ዘይት', 'bulk.notes': 'ልዩ ማስታወሻ (አማራጭ)',
        'bulk.submit': 'የጅምላ ጥያቄ ያስገቡ', 'bulk.successTitle': 'የጅምላ ጥያቄ ተቀብለናል!',
        'bulk.successText': 'የእኛ የወረዳ አቅርቦት ቡድን ዋጋን፣ የመጠን ቅናሾችን እና የመላኪያ መርሃ ግብርን ለማረጋገጥ በ24 ሰዓት ውስጥ ያነጋግርዎታል።',
        'bulk.ref': 'ማመሳከሪያ:', 'bulk.done': 'ተጠናቋል',
        'bulk.summaryValue': 'ግምታዊ ወርሃዊ የትዕዛዝ ዋጋ: {0} ብር',
        'bulk.summarySavings': 'ከችርቻሮ ጋር ግምታዊ ቁጠባ (~{0}%)',
        'bulk.validation': 'እባክዎ ሁሉንም የግዴታ መስኮች ይሙሉ።',
        'bulk.required': 'እባክዎ ሁሉንም የግዴታ መስኮች ይሙሉ።', 'bulk.produceDefault': 'ምርት ይምረጡ',
        'bulk.estQty': 'የተገመተ መጠን', 'bulk.estWholesale': 'የተገመተ የቡድን የጅምላ ዋጋ',
        'bulk.estRetail': 'የተገመተ የችርቻሮ ዋጋ', 'bulk.estSave': 'የተገመተ ቁጠባ',
        'bulk.disclaimer': 'ግምት ብቻ — የመጨረሻው ዋጋ በወረዳ አቅርቦት ቡድናችን ይረጋገጣል።',
        'common.cancel': 'ሰርዝ',
        'ai.subtitle': 'ቀጥተኛ የወረዳ አቅርቦት፣ የማከማቻ መመሪያዎች እና የቡድን ግዢ ስሌቶች',
        'ai.placeholder': 'ስለ ጅምላ ምርት መጠኖች፣ የጎጃም ጤፍ ዋጋ ወይም የማከማቻ ምክሮች AIን ይጠይቁ...',
        'ai.processing': 'NuroTewedede AI የወረዳ አቅርቦት መረጃን በማስኬድ ላይ...',
        'ai.chip1': 'ለአዲስ አበባ የ20 ቤተሰብ ጤፍ እና ቅመማ ቅመም የቡድን ትዕዛዝ እንዴት እንያቅማል?',
        'ai.chip2': '50ኪግ ቀይ ሽንኩርት እንዳይበሰብስ የሚያደርጉ ምርጥ የማከማቻ ምክሮች ምንድናቸው?',
        'ai.chip3': 'የጎጃም ነጭ ጤፍ ከፍተኛ የመኸር ወቅት እና የዋጋ አዝማሚያዎች መቼ ናቸው?',
        'ai.chip4': 'ለ30 ሰው የበዓል ግብዣ የጅምላ ግሮሰሪ ዝርዝር ጠቁሙ',
        'ai.welcome': 'ሰላም! እኔ **NuroTewedede AI** ነኝ፣ ለኢትዮጵያ የሰፈር ማዕከላት የግብርና አቅርቦት እና የቡድን ግዢ አማካሪዎ ነኝ።\n\nሊረዳዎት የሚችለው:\n- **የጅምላ አቅርቦት ግምቶች:** ለ5 እስከ 50 ቤተሰቦች የጤፍ፣ ሽንኩርት፣ ቡና፣ ዘይት ወይም ጥራጥሬ መጠኖችን ማስላት።\n- **የመኸር እና የዋጋ ወቅታዊነት:** በጎጃም፣ ሲዳማ፣ ዝዌይ፣ አርሲ እና ጅማ ከፍተኛ የመኸር ወራትን ማግኘት።\n- **የምርት ማከማቻ መመሪያዎች:** የጅምላ 50ኪግ ቦርሳዎችን ያለ ብስባሽነት እንዴት እንደሚጠብቁ።\n- **የበዓል ግብዣ እቅድ:** ለማህበረሰብ ክብረ በዓላት (እንቁጣጣሽ፣ ገና፣ ጥምቀት፣ ኢድ) የጅምላ ግሮሰሪ ትዕዛዞችን ማስተካከል።\n\nከታች የፈጣን ርዕስ ይምረጡ ወይም ጥያቄዎን ይፃፉ!',
        'footer.tagline': '© 2026 NuroTewedede ቀጥተኛ አቅርቦት መድረክ • የሰፈር ቡድን ግዢ መረብ',
        'toast.copied': 'የቫውቸር ኮድ ተቀድቷል!',
        'toast.reserved': '{0} አክሲዮን(ኦች) በተሳካ ሁኔታ ተይዘዋል! ዲጂታል የመቀበያ ቫውቸር ተዘጋጅቷል።',
        'toast.bulkSubmitted': 'የጅምላ ጥያቄ {0} ገብቷል! የወረዳ አቅርቦት ቡድናችን በ24 ሰዓት ውስጥ ያነጋግርዎታል።',
        'brand.tagline': 'የሰፈር የቡድን ግዢ መድረክ',
        'meta.title': 'NuroTewedede : የሰፈር የቡድን ግዢ መድረክ',
        'meta.description': 'የኢትዮጵያ የሰፈር የቡድን ግዢ መድረክ፡ ከጎረቤቶችዎ ጋር የጅምላ ዋጋ ይቆልፉ፣ አክሲዮኖችን ይያዙ እና የመቀበያ ቫውቸሮችን ይከታተሉ።',
        'aria.toggleMenu': 'ምናሌ ይቀይሩ', 'aria.toggleTheme': 'የጨለማ ሁነታን ይቀይሩ', 'aria.selectLang': 'ቋንቋ ይምረጡ',
        'aria.ticker': 'የቀጥታ የጅምላ ዋጋ ታይፕ', 'aria.openAi': 'NuroAI ረዳትን ይክፈቱ', 'aria.closeAi': 'NuroAI ረዳትን ይዝጉ',
        'aria.closeModal': 'መስኮቱን ይዝጉ', 'aria.close': 'ዝጋ', 'aria.backToTop': 'ወደ ላይ ተመለስ',
        'calc.year': '/ በዓመት',
        'calc.item1': 'ነጭ ጤፍ (ጎጃም)', 'calc.item2': 'ቀይ ሽንኩርት (ዝዌይ)', 'calc.item3': 'ድፍድፍ የቡና ፍሬ (ሲዳማ)',
        'calc.item4': 'የሱፍ አበባ የምግብ ዘይት (ሊትር)', 'calc.item5': 'ቀይ ምስር',
        'hubs.live': 'የቀጥታ የኮሪደር ክትትል: ኢትዮጵያ', 'hubs.hubLabel': 'ማዕከል:',
        'hubs.sourcingUnions': 'ዋና የአቅርቦት ህብረት ስራዎች:', 'hubs.address': 'የማዕከል አድራሻ:', 'hubs.directLinks': 'ቀጥተኛ የወረዳ አገናኞች:',
        'ai.title': 'NuroAI ረዳት', 'ai.badgeYou': 'እርስዎ', 'ai.badgeAi': 'AI',
        'ai.noResponse': 'ምንም ምላሽ አልተቀበለም።', 'ai.error': 'ከGemini AI ረዳት ጋር መገናኘት አልተቻለም',
        'ai.prompt1': 'የ20 ቤተሰብ ጤፍ እና ቅመማ ቅመም የቡድን ትዕዛዝ ለአዲስ አበባ እንዴት እናቅዳለን?',
        'ai.prompt2': 'የ50ኪግ ቀይ ሽንኩርት መበስበስን ለመከላከል ምን የማከማቻ ምክሮች አሉ?',
        'ai.prompt3': 'የጎጃም ነጭ ጤፍ የመኸር ሰሞን መቼ ነው እና የዋጋ አዝማሚያው ምን ይመስላል?',
        'ai.prompt4': 'ለ30 ሰው የበዓል ግብዣ የጅምላ ግሮሰሪ አቅርቦት ዝርዝር ጠቁም',
        'time.justNow': 'አሁን ብቻ', 'time.today': 'ዛሬ', 'time.d': 'ቀ', 'time.h': 'ሰ',
        'err.serverUnreachable': 'አገልጋዩ ላይ መድረስ አልተቻለም። የኋላ ማዕከሉ እየሰራ መሆኑን ያረጋግጡ (npm start በፕሮጀክት አቃፊው)።',
        'err.htmlInsteadJson': 'አገልጋዩ ከJSON ይልቅ በHTML መልሷል', 'err.requestFailed': 'ጥያቄው አልተሳካም',
        'toast.signinReserve': 'አክሲዮን ለማስያዝ እባክዎ መጀመሪያ ይግቡ።',
        'toast.poolFullyReserved': 'ይህ ግዢ ሙሉ በሙሉ ተይዟል።',
        'toast.signinComment': 'አስተያየት ለመለጠፍ እባክዎ መጀመሪያ ይግቡ።',
        'toast.commentPosted': 'አስተያየት በማህበረሰብ መግለጫ ሰሌዳ ላይ ተለጠፈ።',
        'toast.signinLike': 'አስተያየት ለመውደድ እባክዎ መጀመሪያ ይግቡ።',
        'toast.signinLaunch': 'ግዢ ለመጀመር እባክዎ መጀመሪያ ይግቡ።',
        'toast.poolLaunched': 'አዲስ የቡድን ግዢ በተሳካ ሁኔታ ተጀመረ!',
        'toast.poolCreateError': 'ግዢ ሲፈጠር ስህተት ተከሰተ', 'toast.signedOut': 'በተሳካ ሁኔታ ወጥተዋል።',
        'pool.fallbackTitle': 'የማህበረሰብ ግዢ', 'pool.fallbackWoreda': 'የክልል ወረዳ',
        'pool.fallbackUnit': '1 አክሲዮን', 'pool.fallbackOrganizer': 'የሰፈር ቡድን አስተባባሪ',
        'pool.fallbackPickup': 'በዚህ ሳምንት', 'pool.fallbackCategory': 'ግሮሰሪ',
        'pool.fallbackHubSuffix': 'የሰፈር ስርጭት ማዕከል', 'pool.fallbackGroupPool': 'የቡድን ግዢ',
        'pool.fallbackBag': '50ኪግ ቦርሳ',
        'details.neighborBuyer': 'ጎረቤት ገዢ', 'details.title': 'የማህበረሰብ ውይይት እና ዝርዝሮች',
        'myshares.signinBtn': 'ግባ', 'myshares.emptyTitle': 'እስካሁን የቡድን ግዢ አክሲዮን አላስያዙም።',
        'myshares.viewVoucher': 'ቫውቸር ይመልከቱ',
        'bulk.notesPh': 'ለምሳሌ ልዩ የመላኪያ መመሪያዎች፣ የጥራት ምርጫዎች ወይም የሚመርጡት የመገናኛ ሰዓት።',
        'voucher.qrAlt': 'የQR ቫውቸር'
    },
    om: {
        'nav.pools': 'Bituuwwan Ijoo', 'nav.calculator': 'Herrega Qusannaa',
        'nav.hubs': 'Maapa Buufataa', 'nav.myshares': 'Qooda Koo Bakka Buufame', 'nav.bulk': 'Waldaa fi Dhaabbataa',
        'nav.signin': 'Seeni', 'nav.signout': 'Ba\'i', 'nav.launch': '+ Bituu Jalqabi', 'nav.townHub': 'Buufata Magaalaa:',
        'nav.menu': 'Menu', 'nav.home': 'Mana', 'nav.service': 'Tajaajila', 'nav.about': 'Waa\'ee Nu', 'nav.how': 'Akkamitti hojjata',
        'ticker.label': 'Gatii Diinqaa',
        'hero.title': 'Gubbattii Nyaataa Waliin Haalollu',
        'hero.subtitle': 'Oomisha qonnaa naannootti kallattiin buufataa raabsaatti wal qunnamsiisuun gatii daldala gurguddaa hawaasni argatu',
        'hero.bulkHint': 'Kaafiiwwan, mana barumsaa, hotelota fi koo-piive — ji\'atti 100+ kg',
        'service.badge': 'Waan Hojjennu',
        'service.title': 'Hawaasota bituu waldaatiin walitti fiduu cimnee jaallanna',
        'service.subtitle': 'NuroTewedede hawaasota Itiyoophiyaa oomisha gatii gidduu keessa argachuu, qonnaan bultoota naannoo deeggaruu fi sirna nyaataa cimaa ijaaruuf carraa kennuuf gumaacha.',
        'service.card1Title': 'Lola Gubbattii Nyaataa',
        'service.card1Text': 'Ajaja waliin walitti qabuun gatii daldalaa aanaalee qonnaa irraa kallattiin argachuun guddina gatii daldalaa moo\'uu.',
        'service.card2Title': 'Qonnaan Bultoota Itiyoophiyaa Deeggara',
        'service.card2Text': 'Buufata raabsaa magaalaa fi oomishitoota qonnaa naannoo daldala haqaa fiixeen wal qunnamsiisa.',
        'service.card3Title': 'Logistiksii Waldaa Olaa',
        'service.card3Text': 'Bittaa waldaa hawaasaa jiraatu keessa salphaatti seeni yookiin buufata kee sekondii keessatti bani.',
        'about.badge': 'Waa\'ee NuroTewedede',
        'about.title': 'NuroTewedede: Qonnaan bultootaaf jireenya, bituuftootaaf jijjiirraa.',
        'about.text': 'Humna daldala hawaasaatiin ijaaramuun, NuroTewedede aanaalee qonnaa fi naannoo magaalaa wal qunnamsiisee argama wantoota bu\'uuraa jijjiirra. Daldaltoota faayidaa qofaaf hojjetan balleessuun, gatii daldalaa kallattiin oomishitoota irraa hawaasaatti geessa. Qonnaan bultootaaf kaffaltii haqaa fi magaala gurguddoo Itiyoophiyaa keessatti dandeettii gabaati. Bituuftootaaf immoo jireenya oomishitoota naannoo deeggaruun hanga 35% qusachuu jechuudha. Waliin sirna nyaataa haqaa fi cimaa ijaarra.',
        'about.mockTeff': 'Xaafii (Adii Gojjam)',
        'about.mockGojjam': 'Aanaa Gojjam',
        'about.mockOnion': 'Shunkurtii Diimaa - 25kg',
        'about.mockCoffee': 'Buna Sidaama - 10kg',
        'about.mockBarley': 'Garbuu Waldaa - 40kg',
        'about.mockBadge': 'Oomisha Naannoo',
        'how.badge': 'Akkamitti hojjata',
        'how.title': 'Galgara kee itti dabali, hafeef nu dhiiisi',
        'how.step1Title': 'Garee yookiin bituu uumi',
        'how.step1Text': 'Gatii daldalaa haqaa argachuuf NuroTewedede irratti garee yookiin bituu uumi.',
        'how.step2Title': 'Hawaasa kee affeeri',
        'how.step2Text': 'Linkii oomishaa qooduun gaaressa, hiriyyaa yookiin maatii affeeri.',
        'how.timeLeft': 'Yeroo hafe:',
        'how.step3Title': 'Cufiitii qusadhu',
        'how.step3Text': 'Gareen lakkoofsa hirmaattotaa gaafa ga\'u, ajajni daldalaa aanaalee naannoo irraa cufamee hir\'ina guddaan kaa\'ama.',
        'how.statSourcing': 'Dhiyeessaa Qonnaa',
        'how.statSourcingSub': 'Kallattiin aanaalee naannoo irraa',
        'how.statLogistics': 'Logistiksii Naannoo',
        'how.statLogisticsSub': 'Geessaa buufata hawaasaa',
        'how.statGroupPooling': 'Bittaa Waldaa',
        'how.statGroupPoolingSub': 'Qusannaa daldalaa waliigalaa',
        'how.statDelivery': 'Geessaa Hawaasaa',
        'how.statDeliverySub': 'Daldala haqaa balbala keetti',
        'bulk.cta': '🏭 Ajaja Waldaa fi Dhaabbataa',
        'metric.savings': 'Qusannaa Giddu Galeessaa', 'metric.woredas': 'Aanaalee Qunnamtee', 'metric.pools': 'Buufata Ijoo',
        'pools.title': 'Bituuwwan Waldaa Ijoo', 'pools.showing': 'Bituuwwan hunda mul\'isaa', 'pools.allProducts': 'Oomisha Hunda',
        'pools.search': 'Oomisha, ramaddii yookiin aanaa barbaadi...', 'pools.sortBy': 'Haarami:',
        'pools.allTowns': 'Magaalota / Buufata Hunda',
        'pools.sortDefault': 'Durtii', 'pools.sortSavings': 'Qusannaa Olii %',
        'pools.sortPriceAsc': 'Gatii: Xiqqaa hanga Guddaa', 'pools.sortPriceDesc': 'Gatii: Guddaa hanga Xiqqaa',
        'pools.sortProgress': 'Sadarkaa Ka\'aabii',
        'pools.showingCount': 'Bituu(wwan) {0} mul\'isaa', 'pools.searchResults': 'Ibsa "{1}" {0} (wwan) mul\'isaa',
        'card.origin': 'Ka\'umsa: {0}', 'card.pickup': 'Fudhachaa: {0}', 'card.unit': 'Gita: {0}',
        'card.hub': 'Buufata {0}', 'card.groupPrice': 'Gatii Waldaa', 'card.marketRetail': 'Daldala Gabaa',
        'card.saveUnit': 'Qusadhu {0} ETB / gita', 'card.savePct': '{0}% Qusadhu',
        'card.reservation': 'Ajaja Bakka Bituu', 'card.shares': 'qooda {0} / {1} ({2}%)',
        'card.daysLeft': '{0} guyyaa hafe', 'card.lockingToday': 'Har\'a cufama', 'card.organizer': 'Qindeessaa: {0}',
        'card.reserve': 'Bakka Fudhadhu', 'card.fullyReserved': 'Bituun guutumaan bakka buufame',
        'card.share': 'Bituu Qooddhaa', 'card.shareTitle': 'Waliin qooddhaa', 'card.shareTelegram': 'Telegraamii',
        'card.shareWhatsapp': 'Waats-App', 'card.copyLink': 'Limmoo Galeessi', 'card.shareToast': 'Limmoon bituu gara galmee quxxumaa garagaltee!',
        'card.countdownEnds': 'Dhuma: {0}', 'card.endsToday': 'Har\'a dhuma',
        'card.calendar': 'Yaadachiisa Fudhachaa Kaalaandarii Itti Dabali',
        'share.title': 'Bituu Qooddhaa', 'share.linkCopied': 'Limmoon bituu gara galmee quxxumaa garagaltee!',
        'card.noPools': 'Bituu waldaa ulaagaa keessan wajjin wal qabu hin argamne.',
        'badge.ready': 'Fudhachuuf Qophii', 'badge.transit': 'Daandii Geejjibaa Irra',
        'badge.locked': 'Bituun Cufame', 'badge.active': 'Bituu Ijoo',
        'cat.all': 'Hunda', 'cat.grains': 'Midhaanii fi Xaafii', 'cat.vegetables': 'Kuduraa',
        'cat.coffee': 'Buna fi Urgooftuu', 'cat.oil': 'Zayitaa fi Huubuu', 'cat.fruits': 'Muduraa',
        'calc.badge': 'Lola Gubbattii Tarmata', 'calc.title': 'Herrega Qusannaa Maatii Naannoo',
        'calc.subtitle': 'Gatii gabaa daldalaa NuroTewedede qulqullinaa wajjin wal bira qaba.',
        'calc.family': 'Hamma Maatii:', 'calc.people2': 'Namoota 2', 'calc.people4': 'Namoota 4',
        'calc.people6': 'Namoota 6', 'calc.people8': 'Namoota 8', 'calc.adjust': 'Fayyadama oomishaa ji\'aa sirreessi',
        'calc.impact': 'Faltoo Herraman', 'calc.monthlySavings': 'Qusannaa Ji\'a Tilmaama',
        'calc.savePercent': 'Gaba daldalaa wajjin wal bira qabudhaan {0}% qusadhu!', 'calc.retail': 'Baasii Daldala Naannoo:',
        'calc.wholesale': 'Baasii Waldaa NuroTewedede:', 'calc.annual': 'Qusannaa Waggaa Maatii:',
        'calc.note': 'Ajajoota waldaa maatiilee 10–20 wajjin cufuudhaan baasii geejjiba walqixaan ramadama, dabaluu daldalaa ni cufa.',
        'calc.chartTitle': 'Walbira Qabsiisa Baasii Ji\'a — Daldala fi Waldaa',
        'calc.chartRetail': 'Daldala Gabaa', 'calc.chartGroup': 'Waldaa NuroTewedede',
        'calc.month': '{0} {1} / ji\'a', 'calc.groupRate': 'Gatii Waldaa: {0} ETB/unit',
        'calc.retailMarket': 'Gabaa Daldalaa: {0} ETB/unit', 'calc.saveItem': '{0} ETB qusadhu',
        'calc.unitsKg': 'kg', 'calc.unitsLitres': 'Liiitra',
        'hubs.badge': 'Sarkiyaa Dhiyeessaa Aanaa-Buufataa', 'hubs.title': 'Maapa Qulqullinaa Itoophiyaa fi Argama Buufataa',
        'hubs.subtitle': 'Sochi oomishaa waldaalee qonnaa hanga iddoowwan raabsaa naannootti hordofaa.',
        'hubs.select': 'Buufata Raabsaa Naannoo Filadhu', 'hubs.activePools': 'Bituuwwan Ijoo {0}',
        'hubs.details': 'Ibsa {0}',
        'myshares.title': 'Qooda Koo Bakka Buufame fi Vaawwarcha Fudhachaa',
        'myshares.subtitle': 'Oomisha fudhachuuf vaawwarchaawwan ticket QR kana koordinaatorii buufataatti argisiisaa.',
        'myshares.empty': 'Amma yoomuu qooda bituu hin buufanne.',
        'myshares.browse': 'Bituuwwan Waldaa Ijoo ilaali',
        'myshares.signinFirst': 'Qooda kee fi vaawwarcha kee ilaaluuf seeni.',
        'myshares.shares': 'Qooda: {0} unit(wwan)', 'myshares.method': 'Mala: {0}',
        'myshares.voucherCode': 'Koodii Vaawwarchaa', 'myshares.reservedOn': 'Yeroo bakka buufame: {0}',
        'myshares.hub': 'Buufata: {0}', 'myshares.pickup': 'Fudhachaa: {0}',
        'myshares.voucherBtn': 'Vaawwarcha Fudhachaa Argadhu',
        'myshares.voucher': 'Koodii Vaawwarchaa: {0}', 'myshares.copy': 'Galchi',
        'status.active': 'Ijoo', 'status.ready': 'Fudhachuuf Qophii', 'status.collected': 'Fudhatame',
        'reserve.badge': 'Bakka Bituu Keessatti Fudhadhu', 'reserve.direct': '{1} waliin {0} irraa kallattiin',
        'reserve.selectShares': 'Qooda Filadhu ({0})', 'reserve.maxAvailable': 'Baay\'ina argamu: {0}',
        'reserve.subtotal': 'Waliigala', 'reserve.retailCost': 'Baasii gabaa daldalaa:',
        'reserve.youSave': 'Waldaa wajjin Qusattu:', 'reserve.paymentMethod': 'Mala Kaffaltii / Waasti Argadhu',
        'reserve.notice': 'Beeksisa ajajaa {0} waliin ergama. Iddoo fudhachaa: {1} {2}tti.',
        'reserve.confirm': 'Bakka Buufachuu Mirkaneessi ({0} ETB)', 'reserve.reserving': 'Bakka buufachaa jira...',
        'pay.telebirr': 'TeleBirr', 'pay.cbe': 'CBE Birrii', 'pay.cash': 'Buufataatti Kaffali',
        'success.title': 'Bakka Buufachuun Mirkanaa\'e!',
        'success.subtitle': 'Vaawwarcha fudhachaa digitaalaa kee {0}tti qophaa\'eera.',
        'success.ticketCode': 'Koodii Tikeetii Fudhachaa', 'success.qty': 'Baay\'ina: {0} x {1}',
        'success.hub': 'Buufata: {0}', 'success.pickupDate': 'Guyyaa Fudhachaa: {0}', 'success.method': 'Mala: {0}',
        'success.done': 'Xumurame', 'success.print': 'Vaawwarchaa Maxxansi', 'success.copy': 'Koodii Vaawwarchaa Galcha',
        'success.copied': 'Koodiin vaawwarchaa galateeffame!',
        'voucher.title': 'Vaawwarcha Fudhachaa', 'voucher.customer': 'Maamilaa', 'voucher.item': 'Wantoota',
        'voucher.note': 'Oomisha kee fudhachuuf vaawwarcha kana koordinaatorii buufataatti argisiisi.',
        'details.noComments': 'Yaanni hamma yoomuu hin jiru. Gaaressa jalqabaaf mee yaada galchi!',
        'details.origin': 'Ka\'umsa: {0}', 'details.unit': 'Gita: {0} • Buufata Fudhachaa: {1}',
        'details.progress': 'Sadarkaa ({0} / {1} qooda)', 'details.percentReserved': '{0}% Bakka buufame',
        'details.organizer': 'Qindeessaa: {0}', 'details.reserve': 'Bakka Fudhadhu',
        'details.board': 'Gabatee Hawaasa Naannoo ({0})', 'details.commentPh': 'Gaaffii gaafadhu yookiin koordinaatorii bituuf hubachiisa galchi...',
        'details.post': 'Galchi', 'details.coordinator': 'Koordinaatorii',
        'details.like': 'Jaalladhu', 'details.liked': 'Jaalladheera', 'details.likeToast': 'Yaadni jaallatame!', 'details.unlikeToast': 'Jaallannoon buqqa\'e.',
        'create.title': 'Bituu Waldaa Haaraya Jalqabi', 'create.item': 'Wantoota / Maqaa Oomishaa',
        'create.itemPh': 'fkn. Xaafii (Adii Gojjam) - 50kg', 'create.category': 'Ramaddii', 'create.town': 'Magaalaa / Buufata',
        'create.woreda': 'Ka\'umsa Aanaa', 'create.woredaPh': 'fkn. Debre Markos', 'create.unit': 'Gita Gurmaa',
        'create.unitPh': 'fkn. Korojoo 50kg', 'create.wholesale': 'Gatii Daldala (ETB)', 'create.retail': 'Gatii Daldalaa (ETB)',
        'create.retailPh': 'auto (45% dabaluu)', 'create.target': 'Qooda Galma', 'create.hub': 'Iddoo Buufata Fudhachaa',
        'create.hubPh': 'fkn. Buufata Bole Megenagna #2', 'create.organizer': 'Maqaa Qindeessaa / Hoogganaa Waldaa',
        'create.organizerPh': 'fkn. Abebe Tadesse (Koordinaatorii Kebele)', 'create.submit': 'Bituu Uumi',
        'auth.signin': 'Seeni', 'auth.signup': 'Hertamaa Uumi', 'auth.email': 'Teessoo Imeelii',
        'auth.emailPh': 'name@example.com', 'auth.password': 'Jecha Iccitii', 'auth.passwordPh': '••••••••',
        'auth.name': 'Maqaa Guutuu', 'auth.namePh': 'Abebe Kebede',
        'auth.username': 'Maqaa Fayyadamaa', 'auth.usernamePh': 'abebe123',
        'auth.emailOrUser': 'Imeelii ykn Maqaa Fayyadamaa', 'auth.emailOrUserPh': 'name@example.com ykn maqaa fayyadamaa kee',
        'auth.nameRequired': 'Maaloo maqaa guutuu kee galchi.',
        'auth.usernameRequired': 'Maaloo maqaa fayyadamaa filadhu.',
        'auth.checkEmail': 'Hertamaan uumame! Hertama kee mirkaneessuuf imeelii kee ilaali, sana booda seeni.',
        'auth.created': 'Hertamaan milkaa\'inaan uumame!',
        'auth.signedIn': 'Milkaa\'inaan seentee jirta!',
        'bulk.title': 'Bituu Waldaa fi Dhaabbataa',
        'bulk.prodTeff': 'Xaafii Adii (Gojjam)', 'bulk.prodOnions': 'Shunkurtii Diimaa (Ziway)', 'bulk.prodCoffee': 'Buna Diimaa (Sidaama)', 'bulk.prodOil': 'Zayitaa Suufii', 'bulk.prodLentils': 'Misira Diimaa',
        'bulk.retailTag': 'daldala',
        'bulk.subtitle': 'Kaafii, mana nyaataa, mana barumsaa, hotela fi koo-piive ji\'atti 100+ kg ajajuuf. Sarkiyaa dhiyeessaa aanaa naannootti kallattiin siqunnamsiifna.',
        'bulk.business': 'Maqaa Daldalaa / Dhaabbataa', 'bulk.businessPh': 'fkn. Kaafii fi Mana Nyaataa Salam',
        'bulk.contact': 'Namni Qunnamti', 'bulk.contactPh': 'fkn. Tigist Alemu',
        'bulk.phone': 'Bilbila / Waatsaap', 'bulk.phonePh': '09 12 345 678',
        'bulk.volume': 'Baay\'ina Ji\'a (kwintaalii)', 'bulk.volumePh': 'fkn. 5',
        'bulk.destination': 'Buufata Dhaqqabaa', 'bulk.produce': 'Oomisha Ijoo Barbaachisaa',
        'bulk.producePh': 'fkn. Xaafii, Shunkurtii Diimaa, Zayitaa Nyaataa', 'bulk.notes': 'Hubachiisa Addaa (filannoo)',
        'bulk.submit': 'Gaaffii Waldaa Ergi', 'bulk.successTitle': 'Gaaffiin Waldaa Fudhatame!',
        'bulk.successText': 'Gareen dhiyeessaa aanaa keenya gatii, hir\'ina baay\'ina fi sagantaa geessuu mirkaneessuuf sa\'aatii 24 keessatti si qunnama.',
        'bulk.ref': 'Wabi:', 'bulk.done': 'Xumurame',
        'bulk.summaryValue': 'Gatii ajajaa ji\'a tilmaama: {0} ETB',
        'bulk.summarySavings': 'Qusannaa daldalaa tilmaama (~{0}%)',
        'bulk.validation': 'Maaloo dirqama hunda guuti.',
        'bulk.required': 'Maaloo dirqama hunda guuti.', 'bulk.produceDefault': 'Oomisha filadhu',
        'bulk.estQty': 'Hamma Tilmaama', 'bulk.estWholesale': 'Daldala waldaa tilmaama',
        'bulk.estRetail': 'Gatii daldalaa tilmaama', 'bulk.estSave': 'Qusannaa Tilmaama',
        'bulk.disclaimer': 'Tilmaama qofa — gatii dhuma gareen dhiyeessaa aanaa keenya mirkaneessa.',
        'common.cancel': 'Haqi',
        'ai.subtitle': 'Dhiyeessaa Aanaa Qulqullinaa, Qajeelfama Kuusannaa fi Herrega Bituu Waldaa',
        'ai.placeholder': 'Waa\'ee hamma oomishaa waldaa, gatii Xaafii Gojjam yookiin gorsa kuusannaa AI gaafadhu...',
        'ai.processing': 'AI NuroTewedede ragaa dhiyeessaa aanaa hojjachaa jira...',
        'ai.chip1': 'Ajaja waldaa Xaafii fi Urgooftuu maatiilee 20 Addis Ababaaf akkamitti karoorfanna?',
        'ai.chip2': 'Shunkurtii diimaa 50kg akka hin tortorree gorsi kuusannaa baay\'ee gaariin maalii?',
        'ai.chip3': 'Yeroo midhaan Xaafii adii Gojjam fi amala gatii yoom?',
        'ai.chip4': 'Irbaata ayyaana nama 30f tarree dhiyeessaa waldaa akeekkachiisi',
        'ai.welcome': 'Akkam! Ani **AI NuroTewedede**, gorsaa dhiyeessaa qonnaa fi bituu waldaa buufata naannoo Itoophiyaati.\n\nWaan si gargaaruu danda\'u:\n- **Tilmaama Dhiyeessaa Waldaa:** Baay\'ina Xaafii, Shunkurtii, Buna, Zayitaa yookiin Huubuu maatiilee 5 hanga 50 tiif herreguu.\n- **Yeroo Midhaanii fi Amala Gatii:** Ji\'oota midhaan guddaa Gojjam, Sidama, Ziway, Arsi fi Jimma keessatti argachuu.\n- **Qajeelfama Kuusannaa Oomishaa:** Korojoo 50kg baqqaana tokko malee akkamitti qabachuu.\n- **Karoorfama Irbaata Ayyaanaa:** Ayyaana hawaasaa (Inqut\'ataash, Gennaa, Timkat, Idd) irbaataaf ajaja waldaa guddisuu.\n\nJalatti mata duree filadhu yookiin gaaffii kee barreessi!',
        'footer.tagline': '© 2026 NuroTewedede Platform Dhiyeessaa Qulqullinaa • Network Bituu Waldaa Naannoo',
        'toast.copied': 'Koodiin vaawwarchaa galateeffame!',
        'toast.reserved': 'Qooda(wwan) {0} milkaa\'inaan bakka buufame! Vaawwarcha fudhachaa digitaalaa qophaa\'e.',
        'toast.bulkSubmitted': 'Gaaffiin waldaa {0} ergame! Gareen dhiyeessaa aanaa keenya sa\'aatii 24 keessatti si qunnama.',
        'brand.tagline': 'Platform Bituu Waldaa Naannoo',
        'meta.title': 'NuroTewedede : Platform Bituu Waldaa Naannoo',
        'meta.description': 'Platform bituu waldaa naannoo Itoophiyaa: gatii daldalaa gaaressa keessan wajjin cufadhaa, qooda bakka buufadhaa, vaawwarcha fudhachaa hordofaa.',
        'aria.toggleMenu': 'Menu jijjiiri', 'aria.toggleTheme': 'Haala dukkanaa jijjiiri', 'aria.selectLang': 'Afaan filadhu',
        'aria.ticker': 'Gatii daldalaa diinqaa', 'aria.openAi': 'Gargaaraa NuroAI bani', 'aria.closeAi': 'Gargaaraa NuroAI cufi',
        'aria.closeModal': 'Foddaa cufi', 'aria.close': 'Cufi', 'aria.backToTop': 'Gara gubbaa deebi',
        'calc.year': '/ waggaatti',
        'calc.item1': 'Xaafii Adii (Gojjam)', 'calc.item2': 'Shunkurtii Diimaa (Ziway)', 'calc.item3': 'Buna Diimaa (Sidaama)',
        'calc.item4': 'Zayitaa Suufii (Liitra)', 'calc.item5': 'Misira Diimaa',
        'hubs.live': 'Hordoffii Corridoor Diinqaa: Itoophiyaa', 'hubs.hubLabel': 'Buufata:',
        'hubs.sourcingUnions': 'Waldaalee Dhiyeessaa Ijoo:', 'hubs.address': 'Teessoo Buufataa:', 'hubs.directLinks': 'Qunnamtii Aanaa Qulqullinaa:',
        'ai.title': 'Gargaaraa NuroAI', 'ai.badgeYou': 'ATI', 'ai.badgeAi': 'AI',
        'ai.noResponse': 'Deebiin hin arganne.', 'ai.error': 'Gargaaraa Gemini AI wajjin wal quunnamuu hin danda\'amne',
        'ai.prompt1': 'Akeekan daldalaa Teeffii fi mi\'eessitootaa maatii 20f Addis Ababaatti akkamitti karoorfanna?',
        'ai.prompt2': 'Shunkurtii diimaa 50kg akka hin bonquuf gorsa kuusaa kamtu jira?',
        'ai.prompt3': 'Yoomtu yeroo midhaan Xaafii Adii Gojjam fi gatii isaa akkamitti jijjirra?',
        'ai.prompt4': 'Tarree dhiyeessaa meelaa waldaa cidhaa namoota 30f akeeki',
        'time.justNow': 'Amma gaaf', 'time.today': 'Har\'a', 'time.d': 'g', 'time.h': 's',
        'err.serverUnreachable': 'Gara serverii ga\'uun hin danda\'amne. Backend kee hojjachaa jiraachuu mirkaneessi (npm start galmee keessa).',
        'err.htmlInsteadJson': 'Server HTML deebise (JSON osoo hin ta\'in)', 'err.requestFailed': 'Gaafatni hin milkoofne',
        'toast.signinReserve': 'Qooda bakka buufachuuf maaloo dura seeni.',
        'toast.poolFullyReserved': 'Bituun kun guutumaan bakka buufameera.',
        'toast.signinComment': 'Yaada galchuuf maaloo dura seeni.',
        'toast.commentPosted': 'Yaadni gabatee hawaasaatti galateeffame.',
        'toast.signinLike': 'Yaada jaallachuuf maaloo dura seeni.',
        'toast.signinLaunch': 'Bituu jalqabuuf maaloo dura seeni.',
        'toast.poolLaunched': 'Bituun waldaa haaraan milkaa\'inaan jalqabame!',
        'toast.poolCreateError': 'Bituu uumuudhaan dogoggora', 'toast.signedOut': 'Milkaa\'inaan ba\'aniiru.',
        'pool.fallbackTitle': 'Bituu Hawaasaa', 'pool.fallbackWoreda': 'Aanaa Naannoo',
        'pool.fallbackUnit': 'Qooda 1', 'pool.fallbackOrganizer': 'Koordinaatorii Garee Naannoo',
        'pool.fallbackPickup': 'Torban kana', 'pool.fallbackCategory': 'Meelaa',
        'pool.fallbackHubSuffix': 'Buufata Raabsaa Naannoo', 'pool.fallbackGroupPool': 'Bituu Waldaa',
        'pool.fallbackBag': 'Korojoo 50kg',
        'details.neighborBuyer': 'Bituuftuu Gaaressa', 'details.title': 'Marii fi Ibsa Hawaasaa',
        'myshares.signinBtn': 'Seeni', 'myshares.emptyTitle': 'Amma yoomuu qooda bituu hin buufanne.',
        'myshares.viewVoucher': 'Vaawwarchaa Ilaali',
        'bulk.notesPh': 'fkn. Qajeelfama geessuu addaa, filannoo qulqullinaa, yookiin yeroo qunnamtii filattuu.',
        'voucher.qrAlt': 'Vaawwarcha QR'
    }
};

// ---------- i18n Helpers ----------

function t(key) {
    const dict = I18N[appLang] || I18N.en;
    if (dict && Object.prototype.hasOwnProperty.call(dict, key)) return dict[key];
    const en = I18N.en[key];
    return en != null ? en : key;
}

function tt(key) {
    let str = t(key);
    for (let i = 1; i < arguments.length; i++) {
        str = str.split('{' + (i - 1) + '}').join(String(arguments[i]));
    }
    return str;
}

function localizeTown(name) {
    const l = TOWN_L10N[name];
    if (l && l[appLang]) return l[appLang];
    return name;
}

function localizeCategory(cat) {
    const key = CATEGORY_L10N[cat];
    return key ? t(key) : cat;
}

const LANG_NAMES = { en: 'English', am: 'Amharic', om: 'Afaan Oromoo' };

function updateLangButtons() {
    document.querySelectorAll('.lang-btn').forEach(function (btn) {
        btn.classList.toggle('lang-btn-active', btn.dataset.lang === appLang);
    });
    document.querySelectorAll('.lang-option').forEach(function (opt) {
        opt.classList.toggle('lang-option-active', opt.dataset.lang === appLang);
    });
    const label = document.getElementById('lang-current-label');
    if (label) label.textContent = LANG_NAMES[appLang] || appLang;
}

function toggleLangDropdown(e) {
    if (e) e.stopPropagation();
    const menu = document.getElementById('lang-dropdown-menu');
    const btn = document.getElementById('lang-dropdown-btn');
    if (!menu) return;
    const open = menu.classList.toggle('hidden');
    if (btn) btn.setAttribute('aria-expanded', String(!open));
}

function closeLangDropdown() {
    const menu = document.getElementById('lang-dropdown-menu');
    const btn = document.getElementById('lang-dropdown-btn');
    if (menu) menu.classList.add('hidden');
    if (btn) btn.setAttribute('aria-expanded', 'false');
}

function toggleMenuDropdown(e) {
    if (e) e.stopPropagation();
    const menu = document.getElementById('menu-dropdown-menu');
    const btn = document.getElementById('menu-dropdown-btn');
    if (!menu) return;
    const open = menu.classList.toggle('hidden');
    if (btn) btn.setAttribute('aria-expanded', String(!open));
}

function closeMenuDropdown() {
    const menu = document.getElementById('menu-dropdown-menu');
    const btn = document.getElementById('menu-dropdown-btn');
    if (menu) menu.classList.add('hidden');
    if (btn) btn.setAttribute('aria-expanded', 'false');
}

function handleMenuAction(menu) {
    closeMenuDropdown();
    const scrollTargets = { home: 'home', service: 'service', about: 'about', how: 'how-it-works' };
    if (menu === 'home') {
        showTab('pools');
    } else if (menu === 'service' || menu === 'about' || menu === 'how') {
        showTab('pools', true);
        const el = document.getElementById(scrollTargets[menu]);
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else {
        showTab(menu);
    }
}

function applyI18n() {
    document.querySelectorAll('[data-i18n]').forEach(function (el) {
        el.textContent = t(el.getAttribute('data-i18n'));
    });
    document.querySelectorAll('[data-i18n-placeholder]').forEach(function (el) {
        el.setAttribute('placeholder', t(el.getAttribute('data-i18n-placeholder')));
    });
    document.querySelectorAll('[data-i18n-aria-label]').forEach(function (el) {
        el.setAttribute('aria-label', t(el.getAttribute('data-i18n-aria-label')));
    });
    document.querySelectorAll('[data-i18n-title]').forEach(function (el) {
        el.setAttribute('title', t(el.getAttribute('data-i18n-title')));
    });
    if (document.documentElement) document.documentElement.lang = appLang;
    document.title = t('meta.title');
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) metaDesc.setAttribute('content', t('meta.description'));
    applyCurrencyUnits();
    updateLangButtons();
    syncAuthFields();
    staggerHeroTitle();
}

function setLang(lang) {
    if (!I18N[lang]) lang = 'en';
    appLang = lang;
    localStorage.setItem('nt-lang', lang);
    applyI18n();
    closeLangDropdown();
    populateTownSelects();
    renderProduceDropdown();
    renderCategoryPills();
    renderPools();
    renderCalculator();
    renderHubs();
    renderAiChips();
    renderTicker();
    if (aiMessages[0] && aiMessages[0].id === 'welcome') aiMessages[0].text = t('ai.welcome');
    renderAiMessages();
    renderBulkCatalog(document.getElementById('bulk-catalog'));
    updateBulkSummary();
    if (currentUser) loadMyShares();
}

function staggerHeroTitle() {
    const title = document.getElementById('hero-title');
    if (!title) return;
    const text = title.textContent.trim();
    if (!text) return;
    title.innerHTML = text.split(/\s+/).map(function (word, i) {
        return '<span class="hero-word" style="animation-delay:' + (150 + i * 90) + 'ms">' + esc(word) + '</span>';
    }).join(' ');
}

const DEFAULT_IMAGE = 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=600&q=80';

const PRESET_SAVINGS_ITEMS = [
    { key: 'calc.item1', name: 'White Teff (Gojjam)', unitPriceWholesale: 96, unitPriceRetail: 144, defaultKgPerMonth: 25, min: 10, max: 150 },
    { key: 'calc.item2', name: 'Red Onions (Ziway)', unitPriceWholesale: 54, unitPriceRetail: 88, defaultKgPerMonth: 15, min: 5, max: 80 },
    { key: 'calc.item3', name: 'Raw Coffee Beans (Sidama)', unitPriceWholesale: 290, unitPriceRetail: 450, defaultKgPerMonth: 5, min: 2, max: 20 },
    { key: 'calc.item4', name: 'Sunflower Cooking Oil (Litre)', unitPriceWholesale: 155, unitPriceRetail: 210, defaultKgPerMonth: 10, min: 2, max: 30 },
    { key: 'calc.item5', name: 'Red Lentils (Misir)', unitPriceWholesale: 168, unitPriceRetail: 236, defaultKgPerMonth: 8, min: 5, max: 50 }
];

const SUPPLY_HUBS = [
    { id: 'hub-addis', name: 'Addis Ababa Central Hub', town: 'Addis Ababa', address: 'Bole Megenagna & Kazanchis Stations', woredaOrigins: ['Debre Markos (Gojjam)', 'Ziway / Batu', 'Arsi Zone'], activeDeliveriesCount: 8, coordinates: { x: 52, y: 48 } },
    { id: 'hub-adama', name: 'Adama Trade Hub', town: 'Adama', address: 'Posta Bet District', woredaOrigins: ['Mojo Sourcing', 'Wonji Agricultural Zone'], activeDeliveriesCount: 4, coordinates: { x: 58, y: 52 } },
    { id: 'hub-hawassa', name: 'Hawassa Lake Hub', town: 'Hawassa', address: 'Central Market Station', woredaOrigins: ['Yirgacheffe', 'Sidama Highlands'], activeDeliveriesCount: 5, coordinates: { x: 54, y: 68 } },
    { id: 'hub-bahirdar', name: 'Bahir Dar Tana Hub', town: 'Bahir Dar', address: 'Kebele 11 Distribution Depot', woredaOrigins: ['East Gojjam Cooperative', 'South Gondar'], activeDeliveriesCount: 6, coordinates: { x: 42, y: 28 } },
    { id: 'hub-jimma', name: 'Jimma Kaffa Hub', town: 'Jimma', address: 'University Gate Station', woredaOrigins: ['Jimma Farmers Union', 'Bonga Valley'], activeDeliveriesCount: 3, coordinates: { x: 38, y: 62 } },
    { id: 'hub-sodo', name: 'Wolaita Sodo Hub', town: 'Wolaita Sodo', address: 'Main Terminal Station', woredaOrigins: ['Chencha Highlands', 'Humbo Farmers Union'], activeDeliveriesCount: 2, coordinates: { x: 46, y: 72 } }
];

const HUB_L10N = {
    'hub-addis': {
        name: { en: 'Addis Ababa Central Hub', am: 'የአዲስ አበባ ማዕከላዊ ማዕከል', om: 'Buufata Giddugaleessaa Finfinnee' },
        address: { en: 'Bole Megenagna & Kazanchis Stations', am: 'የቦሌ መገናኛ እና ካዛንቺስ ጣቢያዎች', om: 'Istaashinii Bole Megenagna fi Kazanchis' },
        woredas: {
            en: ['Debre Markos (Gojjam)', 'Ziway / Batu', 'Arsi Zone'],
            am: ['ደብረ ማርቆስ (ጎጃም)', 'ዝዌይ / ባቱ', 'የአርሲ ዞን'],
            om: ['Debre Markos (Gojjam)', 'Ziway / Batu', 'Naannoo Arsii']
        }
    },
    'hub-adama': {
        name: { en: 'Adama Trade Hub', am: 'የአዳማ የንግድ ማዕከል', om: 'Buufata Daldalaa Adaamaa' },
        address: { en: 'Posta Bet District', am: 'የፖስታ ቤት ወረዳ', om: 'Godina Posta Bet' },
        woredas: {
            en: ['Mojo Sourcing', 'Wonji Agricultural Zone'],
            am: ['የሞጆ አቅርቦት', 'የወንጂ የእርሻ ዞን'],
            om: ['Dhiyeessaa Mojo', 'Naannoo Qonnaa Wonji']
        }
    },
    'hub-hawassa': {
        name: { en: 'Hawassa Lake Hub', am: 'የአዋሳ ሀይቅ ማዕከል', om: 'Buufata Haroo Hawaasaa' },
        address: { en: 'Central Market Station', am: 'የማዕከላዊ ገበያ ጣቢያ', om: 'Istaashinii Gabaa Giddugaleessaa' },
        woredas: {
            en: ['Yirgacheffe', 'Sidama Highlands'],
            am: ['ይርጋቸፍ', 'የሲዳማ ደጋማ አካባቢዎች'],
            om: ['Yirgacheffe', 'Tulluuwwan Sidaama']
        }
    },
    'hub-bahirdar': {
        name: { en: 'Bahir Dar Tana Hub', am: 'የባሕር ዳር ጣና ማዕከል', om: 'Buufata Bahirdaar Tanaa' },
        address: { en: 'Kebele 11 Distribution Depot', am: 'ቀበሌ 11 የስርጭት መጋዘን', om: 'Qindaa Istaashinii Kebele 11' },
        woredas: {
            en: ['East Gojjam Cooperative', 'South Gondar'],
            am: ['የምስራቅ ጎጃም ህብረት', 'ደቡብ ጎንደር'],
            om: ['Waldaa Gojjam Bahaa', 'Godantu Gonder Kibbaa']
        }
    },
    'hub-jimma': {
        name: { en: 'Jimma Kaffa Hub', am: 'የጅማ ካፋ ማዕከል', om: 'Buufata Jimmaa Kaffaa' },
        address: { en: 'University Gate Station', am: 'የዩኒቨርሲቲ በር ጣቢያ', om: 'Istaashinii Baraa Yuunivarsiitii' },
        woredas: {
            en: ['Jimma Farmers Union', 'Bonga Valley'],
            am: ['የጅማ ገበሬዎች ህብረት', 'የቦንጋ ሸለቆ'],
            om: ['Waldaa Qonnaan Bultoota Jimmaa', 'Sulula Boongaa']
        }
    },
    'hub-sodo': {
        name: { en: 'Wolaita Sodo Hub', am: 'የወላይታ ሶዶ ማዕከል', om: 'Buufata Wolayita Sooddoo' },
        address: { en: 'Main Terminal Station', am: 'ዋና የተርሚናል ጣቢያ', om: 'Istaashinii Terminal Ijoo' },
        woredas: {
            en: ['Chencha Highlands', 'Humbo Farmers Union'],
            am: ['የቸንቻ ደጋማ አካባቢዎች', 'የሃምቦ ገበሬዎች ህብረት'],
            om: ['Tulluuwwan Chencha', 'Waldaa Qonnaan Bultoota Humboo']
        }
    }
};

function localizeHub(hub) {
    const l = HUB_L10N[hub.id];
    if (!l) return { name: hub.name, address: hub.address, woredas: hub.woredaOrigins };
    const lang = appLang in l.name ? appLang : 'en';
    const woredas = l.woredas[lang] || hub.woredaOrigins;
    return { name: l.name[lang], address: l.address[lang], woredas: woredas };
}

const AI_QUICK_PROMPTS = [
    { labelKey: 'ai.chip1', promptKey: 'ai.prompt1' },
    { labelKey: 'ai.chip2', promptKey: 'ai.prompt2' },
    { labelKey: 'ai.chip3', promptKey: 'ai.prompt3' },
    { labelKey: 'ai.chip4', promptKey: 'ai.prompt4' }
];

let aiMessages = [
    { id: 'welcome', sender: 'assistant', text: t('ai.welcome'), timestamp: t('time.justNow') }
];
let aiLoading = false;

// ---------- Helpers ----------

function esc(str) {
    return String(str == null ? '' : str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function fmt(n) {
    return Number(n || 0).toLocaleString();
}

function currencyUnit() {
    return appLang === 'am' ? 'ብር' : 'ETB';
}

function applyCurrencyUnits() {
    document.querySelectorAll('[data-currency-unit]').forEach(function (el) {
        el.textContent = currencyUnit();
    });
}

function normalizePool(p) {
    const price = Number(p.price) || 0;
    const retailPrice = Number(p.retail_price ?? p.retailPrice) || Math.round(price * 1.35);
    const currentShares = Number(p.current_shares ?? p.currentShares) || 0;
    const targetShares = Number(p.target_shares ?? p.targetShares) || 1;
    const locked = !!(p.locked || p.status === 'locked' || currentShares >= targetShares);
    const town = p.town || 'Addis Ababa';
    const daysRemaining = Number(p.daysRemaining ?? p.days_remaining ?? 3);
    const createdTs = p.created_at ? new Date(p.created_at).getTime() : NaN;
    const fallbackEnd = Date.now() + daysRemaining * 24 * 60 * 60 * 1000;
    const endsAt = !isNaN(createdTs)
        ? Math.max(Date.now(), createdTs + 7 * 24 * 60 * 60 * 1000)
        : fallbackEnd;
    return {
        ...p,
        id: String(p.id),
        title: p.title || t('pool.fallbackTitle'),
        town,
        woreda: p.woreda || t('pool.fallbackWoreda'),
        price,
        retailPrice,
        unit: p.unit || t('pool.fallbackUnit'),
        currentShares,
        targetShares,
        locked,
        daysRemaining,
        endsAt,
        hubLocation: p.hub_location || p.hubLocation || town + ' ' + t('pool.fallbackHubSuffix'),
        imageUrl: p.image_url || p.imageUrl || DEFAULT_IMAGE,
        organizer: p.organizer || t('pool.fallbackOrganizer'),
        commentsCount: p.comments_count ?? p.commentsCount ?? 0,
        pickupDate: p.pickup_date || p.pickupDate || t('pool.fallbackPickup'),
        category: p.category || t('pool.fallbackCategory'),
        status: p.status || (locked ? 'locked' : 'active')
    };
}

function api(path, options = {}) {
    const token = localStorage.getItem('sb-access-token');
    const origin = (window.location.origin && window.location.origin !== 'null')
        ? window.location.origin
        : 'http://localhost:5000';
    // Try the page's own origin first (normal setup: Express serves the site),
    // then fall back to the default backend port for Live Server / file:// setups.
    const bases = ['http://localhost:5000'];
    if (origin !== 'http://localhost:5000') bases.unshift(origin);

    function request(base) {
        return fetch(base + path, {
            headers: {
                'Content-Type': 'application/json',
                ...(token ? { Authorization: 'Bearer ' + token } : {}),
            },
            credentials: 'include',
            ...options,
        }).then(async (r) => {
            let body = {};
            let jsonOk = true;
            try { body = await r.json(); } catch (e) { jsonOk = false; }
            // The backend always answers /api routes with JSON. If the page is being
            // served from another origin (Live Server, another port) that answered
            // with HTML, treat it as a failed request and fall back to the real backend.
            if (!r.ok || !jsonOk) {
                const err = new Error(jsonOk ? (body.error || t('err.requestFailed')) : t('err.htmlInsteadJson'));
                err.status = r.status;
                err.serverReached = jsonOk;
                err.serverUnreachable = !jsonOk;
                throw err;
            }
            return body;
        });
    }

    function attempt(index) {
        return request(bases[index]).catch(function (err) {
            const shouldRetry = (err instanceof TypeError || !err.serverReached) && index < bases.length - 1;
            if (shouldRetry) return attempt(index + 1);
            if (err instanceof TypeError || !err.serverReached) {
                const netErr = new Error(t('err.serverUnreachable'));
                netErr.serverUnreachable = true;
                throw netErr;
            }
            throw err;
        });
    }

    return attempt(0);
}

// ---------- Toast ----------

function showToast(msg, isError) {
    const toast = document.getElementById('toast');
    if (!toast) return;
    clearTimeout(toastTimer);
    toast.textContent = msg;
    toast.className = 'fixed bottom-6 right-6 z-50 hidden bg-' + (isError ? 'rose' : 'emerald') + '-900 text-white border border-' + (isError ? 'rose' : 'emerald') + '-700 px-4 py-3 rounded-2xl shadow-2xl text-xs font-bold toast-enter';
    toast.classList.remove('hidden');
    toast.classList.add('flex');
    toastTimer = setTimeout(function () {
        toast.classList.remove('toast-enter');
        toast.classList.add('toast-out');
        setTimeout(function () {
            toast.classList.add('hidden');
            toast.classList.remove('flex');
            toast.classList.remove('toast-out');
        }, 300);
    }, 3600);
}

// ---------- Theme ----------

function toggleTheme() {
    const html = document.documentElement;
    const isDark = html.getAttribute('data-theme') === 'dark';
    html.setAttribute('data-theme', isDark ? 'light' : 'dark');
    html.classList.toggle('dark', !isDark);
    localStorage.setItem('theme', isDark ? 'light' : 'dark');
    updateThemeIcons();
}

function updateThemeIcons() {
    const sunIcon = document.getElementById('theme-icon-sun');
    const moonIcon = document.getElementById('theme-icon-moon');
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    if (sunIcon && moonIcon) {
        sunIcon.classList.toggle('hidden', !isDark);
        moonIcon.classList.toggle('hidden', isDark);
    }
}

function initTheme() {
    const saved = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const theme = saved || (prefersDark ? 'dark' : 'light');
    document.documentElement.setAttribute('data-theme', theme);
    document.documentElement.classList.toggle('dark', theme === 'dark');
    updateThemeIcons();
}

// ---------- Navigation / Tabs ----------

function showTab(tab, noScroll) {
    activeTab = tab;
    document.querySelectorAll('.view-section').forEach(function (sec) {
        sec.classList.add('hidden');
    });
    const target = document.getElementById('view-' + tab);
    if (target) {
        target.classList.remove('hidden');
        target.classList.remove('view-enter');
        void target.offsetWidth;
        target.classList.add('view-enter');
    }

    document.querySelectorAll('.tab-btn').forEach(function (btn) {
        btn.classList.toggle('active', btn.dataset.tab === tab);
    });
    document.querySelectorAll('.mobile-tab-btn').forEach(function (btn) {
        btn.classList.toggle('active', btn.dataset.tab === tab);
    });

    const mobileMenu = document.getElementById('mobile-menu');
    if (mobileMenu) mobileMenu.classList.add('hidden');

    if (tab === 'calculator') renderCalculator();
    if (tab === 'hubs') renderHubs();
    if (tab === 'myshares') loadMyShares();
    if (!noScroll) window.scrollTo({ top: 0, behavior: 'smooth' });
}

function toggleMobileMenu() {
    const menu = document.getElementById('mobile-menu');
    if (!menu) return;
    const hidden = menu.classList.toggle('hidden');
    const btn = document.getElementById('mobile-menu-toggle');
    if (btn) btn.setAttribute('aria-expanded', String(!hidden));
}

function toggleUserMenu() {
    const dropdown = document.getElementById('user-dropdown');
    if (dropdown) dropdown.classList.toggle('hidden');
}

// ---------- Town / Category filtering ----------

function setTown(town) {
    currentFilter = town;
    syncTownDropdowns();
    renderPools();
}

function setCategory(category) {
    currentCategory = category;
    if (category === 'All' || category == null) {
        currentProduce = null;
    } else if (currentProduce && currentProduce.category !== category) {
        currentProduce = null;
    }
    renderProduceDropdown();
    renderCategoryPills();
    renderPools();
}

function renderCategoryPills() {
    const container = document.getElementById('category-pills');
    if (!container) return;
    const cats = ['All'].concat(Array.from(new Set(pools.map(function (p) { return p.category; }))).filter(Boolean));
    container.innerHTML = cats.map(function (cat) {
        return '<button onclick="setCategory(\'' + esc(cat) + '\')" class="cat-pill px-3 py-1.5 rounded-lg text-xs font-bold transition ' + (cat === currentCategory ? 'active' : 'bg-white/10 text-white hover:bg-white/20') + '">' + esc(localizeCategory(cat)) + '</button>';
    }).join('');
}

// ---------- Pools ----------

function renderSkeleton() {
    const grid = document.getElementById('pools-grid');
    if (!grid) return;
    grid.innerHTML = '';
    for (let i = 0; i < 8; i++) {
        const div = document.createElement('div');
        div.className = 'bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm';
        div.innerHTML =
            '<div class="skeleton h-44"></div>' +
            '<div class="p-5 space-y-3">' +
                '<div class="skeleton h-3 w-24 rounded-full"></div>' +
                '<div class="skeleton h-5 w-3/4 rounded-lg"></div>' +
                '<div class="skeleton h-3 w-1/2 rounded-full"></div>' +
                '<div class="skeleton h-12 rounded-2xl"></div>' +
                '<div class="skeleton h-2.5 rounded-full"></div>' +
                '<div class="flex gap-2"><div class="skeleton h-9 w-9 rounded-2xl"></div><div class="skeleton h-9 flex-1 rounded-2xl"></div></div>' +
            '</div>';
        grid.appendChild(div);
    }
}

async function fetchPools() {
    renderSkeleton();
    try {
        const data = await api('/api/pools');
        pools = (data.pools || []).map(normalizePool);
    } catch (err) {
        console.error('Error fetching pools:', err.message);
        pools = [];
        if (err.serverUnreachable) {
            showToast(err.message, true);
        }
    }
    try {
        renderCategoryPills();
    } catch (e) { /* category pills are optional */ }
    renderPools();
    renderTicker();
}

function countUp(el, target, suffix, duration) {
    if (!el || typeof target !== 'number') return;
    suffix = suffix || '';
    duration = duration || 900;
    const current = parseInt(el.dataset.counted, 10) || 0;
    if (current === target) return;
    const start = performance.now();
    function step(now) {
        const p = Math.min(1, (now - start) / duration);
        const eased = 1 - Math.pow(1 - p, 3);
        const val = Math.round(current + (target - current) * eased);
        el.textContent = val + suffix;
        if (p < 1) {
            requestAnimationFrame(step);
        } else {
            el.dataset.counted = String(target);
        }
    }
    requestAnimationFrame(step);
}

function updateMetrics() {
    const totalPools = pools.length;
    const uniqueWoredas = new Set(pools.map(function (p) { return p.woreda; })).size;
    const avgSavings = pools.length > 0
        ? Math.round(pools.reduce(function (sum, p) {
            const retail = p.retailPrice;
            return sum + ((retail - p.price) / retail) * 100;
        }, 0) / pools.length)
        : 0;

    const metricPools = document.getElementById('metric-pools');
    const metricWoredas = document.getElementById('metric-woredas');
    const metricSavings = document.getElementById('metric-savings');
    countUp(metricPools, totalPools, '');
    countUp(metricWoredas, uniqueWoredas, '');
    countUp(metricSavings, avgSavings, '%');
}

function getSortedPools(list) {
    const sorted = list.slice();
    switch (currentSort) {
        case 'price-asc':
            sorted.sort(function (a, b) { return a.price - b.price; });
            break;
        case 'price-desc':
            sorted.sort(function (a, b) { return b.price - a.price; });
            break;
        case 'savings':
            sorted.sort(function (a, b) {
                return (b.retailPrice - b.price) / b.retailPrice - (a.retailPrice - a.price) / a.retailPrice;
            });
            break;
        case 'progress':
            sorted.sort(function (a, b) {
                return (b.currentShares / b.targetShares) - (a.currentShares / a.targetShares);
            });
            break;
        default:
            break;
    }
    return sorted;
}

function getStatusBadge(pool) {
    if (pool.status === 'ready_for_pickup') {
        return '<span class="inline-flex items-center gap-1 bg-emerald-500 text-white text-[10px] font-black uppercase px-2.5 py-1 rounded-full shadow-sm">' + esc(t('badge.ready')) + '</span>';
    }
    if (pool.status === 'in_transit') {
        return '<span class="inline-flex items-center gap-1 bg-blue-600 text-white text-[10px] font-black uppercase px-2.5 py-1 rounded-full shadow-sm">' + esc(t('badge.transit')) + '</span>';
    }
    if (pool.locked || pool.currentShares >= pool.targetShares) {
        return '<span class="inline-flex items-center gap-1 bg-amber-600 text-white text-[10px] font-black uppercase px-2.5 py-1 rounded-full shadow-sm">' + esc(t('badge.locked')) + '</span>';
    }
    return '<span class="inline-flex items-center gap-1 bg-emerald-800 text-white text-[10px] font-black uppercase px-2.5 py-1 rounded-full shadow-sm">' + esc(t('badge.active')) + '</span>';
}

const PIN_ICON = '<svg xmlns="http://www.w3.org/2000/svg" class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243A8 8 0 1117.657 16.657z"/><path stroke-linecap="round" stroke-linejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/></svg>';

function renderPools() {
    const grid = document.getElementById('pools-grid');
    if (!grid) return;
    grid.innerHTML = '';

    let filtered = currentFilter === 'All'
        ? pools
        : pools.filter(function (p) { return p.town === currentFilter; });

    if (currentProduce) {
        const kws = currentProduce.keywords || [];
        filtered = filtered.filter(function (p) {
            const catOk = currentProduce.category ? p.category === currentProduce.category : true;
            const title = (p.title || '').toLowerCase();
            const kwOk = kws.some(function (k) { return title.indexOf(k) !== -1; });
            return catOk && kwOk;
        });
    } else if (currentCategory !== 'All') {
        filtered = filtered.filter(function (p) { return p.category === currentCategory; });
    }

    const searchStatus = document.getElementById('search-status');
    if (currentSearchQuery.trim()) {
        const q = currentSearchQuery.toLowerCase();
        filtered = filtered.filter(function (p) {
            return p.title.toLowerCase().indexOf(q) !== -1 ||
                p.woreda.toLowerCase().indexOf(q) !== -1 ||
                p.town.toLowerCase().indexOf(q) !== -1 ||
                p.category.toLowerCase().indexOf(q) !== -1;
        });
        if (searchStatus) {
            searchStatus.textContent = tt('pools.searchResults', filtered.length, currentSearchQuery);
            searchStatus.classList.remove('hidden');
        }
    } else if (searchStatus) {
        searchStatus.classList.add('hidden');
    }

    const sorted = getSortedPools(filtered);
    const poolCount = document.getElementById('pool-count');
    if (poolCount) poolCount.innerText = tt('pools.showingCount', sorted.length);

    if (sorted.length === 0) {
        grid.innerHTML = '<div class="col-span-full text-center py-12 text-slate-400 text-sm">' + esc(t('card.noPools')) + '</div>';
        updateMetrics();
        return;
    }

    sorted.forEach(function (pool, idx) {
        const percentage = Math.min(100, Math.round((pool.currentShares / pool.targetShares) * 100));
        const savingsAmount = pool.retailPrice - pool.price;
        const savingsPercent = pool.retailPrice > 0 ? Math.round((savingsAmount / pool.retailPrice) * 100) : 0;
        const isReservable = !pool.locked && pool.currentShares < pool.targetShares;

        const card = document.createElement('div');
        card.className = "card-enter bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-200 flex flex-col justify-between group";
        card.style.animationDelay = (idx % 12) * 55 + 'ms';
        card.innerHTML =
            '<div>' +
                '<div class="relative h-44 overflow-hidden bg-slate-100">' +
                    '<img src="' + esc(pool.imageUrl) + '" alt="' + esc(pool.title) + '" class="pool-img w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" loading="lazy" onload="this.classList.add(\'loaded\')" onerror="this.classList.add(\'loaded\')">' +
                    '<div class="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-black/20"></div>' +
                    '<div class="absolute top-3 left-3 right-3 flex items-center justify-between gap-2">' +
                        getStatusBadge(pool) +
                        '<span class="bg-amber-400 text-slate-950 text-[11px] font-black uppercase px-2.5 py-1 rounded-full shadow-sm">' + esc(tt('card.savePct', savingsPercent)) + '</span>' +
                    '</div>' +
                    '<div class="absolute bottom-3 left-3 right-3 text-white">' +
                        '<span class="inline-block bg-white/20 backdrop-blur-md border border-white/30 text-[10px] font-bold px-2 py-0.5 rounded-md mb-1">' + esc(localizeCategory(pool.category)) + '</span>' +
                        '<div class="flex items-center gap-1 text-[11px] text-slate-200 font-medium truncate">' + PIN_ICON + '<span>' + esc(tt('card.origin', pool.woreda)) + '</span></div>' +
                    '</div>' +
                '</div>' +
                '<div class="p-5 space-y-4">' +
                    '<div>' +
                        '<div class="flex items-center justify-between text-[11px] font-bold text-emerald-700 uppercase tracking-wider mb-1">' +
                            '<span>' + esc(tt('card.hub', localizeTown(pool.town))) + '</span><span>' + esc(tt('card.pickup', pool.pickupDate)) + '</span>' +
                        '</div>' +
                        '<h3 class="text-base font-extrabold text-slate-900 truncate">' + esc(pool.title) + '</h3>' +
                        '<p class="text-xs text-slate-500 font-medium">' + esc(tt('card.unit', pool.unit)) + '</p>' +
                    '</div>' +
                    '<div class="bg-slate-50 border border-slate-200 rounded-2xl p-3 flex items-center justify-between">' +
                        '<div><p class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">' + esc(t('card.groupPrice')) + '</p><p class="text-lg font-black text-emerald-800">' + fmt(pool.price) + ' ' + currencyUnit() + '</p></div>' +
                        '<div class="text-right"><p class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">' + esc(t('card.marketRetail')) + '</p><p class="text-xs font-semibold text-slate-400 line-through">' + fmt(pool.retailPrice) + ' ' + currencyUnit() + '</p><p class="text-[10px] font-bold text-emerald-600">' + esc(tt('card.saveUnit', fmt(savingsAmount))) + '</p></div>' +
                    '</div>' +
                    '<div class="space-y-1.5">' +
                        '<div class="flex justify-between items-center text-xs font-bold text-slate-700">' +
                            '<span>' + esc(t('card.reservation')) + '</span><span>' + esc(tt('card.shares', pool.currentShares, pool.targetShares, percentage)) + '</span>' +
                        '</div>' +
                        '<div class="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">' +
                            '<div class="h-full rounded-full transition-all duration-500 ' + (percentage >= 100 ? 'bg-amber-500' : 'bg-emerald-600') + '" style="width: ' + percentage + '%"></div>' +
                        '</div>' +
                        '<div class="flex justify-between text-[11px] text-slate-400 font-medium">' +
                            '<span class="font-bold text-slate-500" data-countdown="' + pool.endsAt + '">' + esc(tt('card.countdownEnds', formatCountdownLeft(pool.endsAt - Date.now()))) + '</span>' +
                            '<span>' + esc(tt('card.organizer', String(pool.organizer).split(' ')[0])) + '</span>' +
                        '</div>' +
                    '</div>' +
                '</div>' +
            '</div>' +
            '<div class="p-5 pt-0 flex gap-2">' +
                '<button onclick="sharePool(\'' + pool.id + '\', event)" class="p-2.5 rounded-2xl border border-slate-200 text-slate-600 hover:bg-slate-100 transition flex items-center justify-center gap-1" title="' + esc(t('card.share')) + '">' +
                    '<svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"/></svg>' +
                '</button>' +
                '<button onclick="openPoolDetails(\'' + pool.id + '\')" class="p-2.5 rounded-2xl border border-slate-200 text-slate-600 hover:bg-slate-100 transition flex items-center justify-center gap-1" title="' + esc(t('details.title')) + '">' +
                    '<svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.86 9.86 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/></svg>' +
                    '<span class="text-xs font-bold" data-cc="' + pool.id + '">' + pool.commentsCount + '</span>' +
                '</button>' +
                '<button onclick="openReserveModal(\'' + pool.id + '\')" ' + (isReservable ? '' : 'disabled') + ' class="flex-1 py-2.5 rounded-2xl text-xs font-black transition shadow-sm flex items-center justify-center gap-1.5 ' + (isReservable ? 'bg-emerald-800 hover:bg-emerald-700 text-white' : 'bg-slate-200 text-slate-500 cursor-not-allowed') + '">' +
                    (isReservable ? esc(t('card.reserve')) : esc(t('card.fullyReserved'))) +
                '</button>' +
            '</div>';
        grid.appendChild(card);
    });

    updateMetrics();
}

// ---------- Live Price Ticker ----------

function renderTicker() {
    const track = document.getElementById('ticker-track');
    if (!track) return;
    if (!pools.length) {
        track.innerHTML = '<span class="text-[11px] text-slate-500">' + esc(t('ticker.label')) + ' —</span>';
        return;
    }
    const items = pools.slice(0, 14).map(function (p) {
        const savePct = p.retailPrice > 0 ? Math.round(((p.retailPrice - p.price) / p.retailPrice) * 100) : 0;
        return '<span class="inline-flex items-center gap-2 text-xs font-bold">' +
            '<span class="text-slate-500">' + esc(localizeTown(p.town)) + '</span>' +
            '<span class="text-white">' + esc(p.title) + '</span>' +
            '<span class="text-emerald-300">' + fmt(p.price) + ' ' + currencyUnit() + '</span>' +
            '<span class="text-slate-500 line-through text-[10px]">' + fmt(p.retailPrice) + '</span>' +
            '<span class="text-amber-400 bg-amber-400/10 px-1.5 py-0.5 rounded-md">' + savePct + '%</span>' +
        '</span>';
    });
    const row = items.join('<span class="text-slate-700">•</span>');
    track.innerHTML = row + '<span class="text-slate-700">•</span>' + row;
}

// ---------- Reserve Modal ----------

function openReserveModal(id) {
    if (!currentUser) {
        showToast(t('toast.signinReserve'));
        openAuthModal();
        return;
    }
    const pool = pools.find(function (p) { return p.id === String(id); });
    if (!pool) return;
    if (pool.locked || pool.currentShares >= pool.targetShares) {
        showToast(t('toast.poolFullyReserved'));
        return;
    }
    reserveState = { pool: pool, shares: 1, payment: 'telebirr' };
    renderReserveForm();
    const modal = document.getElementById('reserve-modal');
    if (modal) {
        modal.classList.remove('hidden');
        modal.classList.add('flex');
    }
}

function closeReserveModal() {
    const modal = document.getElementById('reserve-modal');
    if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }
}

function renderReserveForm() {
    const card = document.getElementById('reserve-modal-card');
    if (!card || !reserveState.pool) return;
    const pool = reserveState.pool;
    const maxShares = Math.max(1, pool.targetShares - pool.currentShares);
    const shares = Math.min(reserveState.shares, maxShares);
    reserveState.shares = shares;
    const totalPrice = pool.price * shares;
    const totalRetailPrice = pool.retailPrice * shares;
    const totalSavings = totalRetailPrice - totalPrice;
    const methods = ['telebirr', 'cbe', 'cash'];
    const methodLabels = { telebirr: t('pay.telebirr'), cbe: t('pay.cbe'), cash: t('pay.cash') };
    const methodColors = { telebirr: 'text-emerald-600', cbe: 'text-blue-600', cash: 'text-amber-600' };

    const methodButtons = methods.map(function (m) {
        const active = reserveState.payment === m;
        return '<button type="button" onclick="setPayment(\'' + m + '\')" class="p-3 rounded-2xl border text-left transition flex flex-col items-center justify-center gap-1.5 ' + (active ? 'border-emerald-600 bg-emerald-50 text-emerald-900 font-bold ring-2 ring-emerald-600/30' : 'border-slate-200 bg-white text-slate-600') + '">' +
            '<svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5 ' + methodColors[m] + '" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"/></svg>' +
            '<span class="text-xs font-bold">' + esc(methodLabels[m]) + '</span>' +
        '</button>';
    }).join('');

    card.innerHTML =
        '<button onclick="closeReserveModal()" class="absolute top-4 right-4 p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition" aria-label="' + esc(t('aria.close')) + '">' +
            '<svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>' +
        '</button>' +
        '<div class="space-y-5">' +
            '<div>' +
                '<span class="inline-flex items-center gap-1 bg-emerald-100 text-emerald-800 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full mb-2">' + esc(t('reserve.badge')) + '</span>' +
                '<h3 class="text-xl font-black text-slate-900">' + esc(pool.title) + '</h3>' +
                '<p class="text-xs text-slate-500 mt-1">' + esc(tt('reserve.direct', pool.woreda, pool.hubLocation)) + '</p>' +
            '</div>' +
            '<div class="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">' +
                '<div class="flex justify-between items-center text-xs font-bold text-slate-700">' +
                    '<span>' + esc(tt('reserve.selectShares', pool.unit)) + '</span><span class="text-emerald-600">' + esc(tt('reserve.maxAvailable', maxShares)) + '</span>' +
                '</div>' +
                '<div class="flex items-center gap-3">' +
                    '<button type="button" onclick="reserveStep(-1)" class="w-10 h-10 rounded-xl bg-white border border-slate-300 font-black text-lg text-slate-800 hover:bg-slate-100 transition">-</button>' +
                    '<span class="text-lg font-black text-slate-900 min-w-[2rem] text-center">' + shares + '</span>' +
                    '<button type="button" onclick="reserveStep(1)" class="w-10 h-10 rounded-xl bg-white border border-slate-300 font-black text-lg text-slate-800 hover:bg-slate-100 transition">+</button>' +
                    '<div class="flex-1 text-right"><p class="text-[10px] text-slate-400 font-bold uppercase">' + esc(t('reserve.subtotal')) + '</p><p class="text-lg font-black text-emerald-800">' + fmt(totalPrice) + ' ' + currencyUnit() + '</p></div>' +
                '</div>' +
                '<div class="pt-2 border-t border-slate-200 flex justify-between text-xs font-semibold">' +
                    '<span class="text-slate-500">' + esc(t('reserve.retailCost')) + '</span><span class="text-slate-400 line-through">' + fmt(totalRetailPrice) + ' ' + currencyUnit() + '</span>' +
                '</div>' +
                '<div class="flex justify-between text-xs font-bold text-emerald-700">' +
                    '<span>' + esc(t('reserve.youSave')) + '</span><span>' + fmt(totalSavings) + ' ' + currencyUnit() + '</span>' +
                '</div>' +
            '</div>' +
            '<div class="space-y-2">' +
                '<label class="block text-xs font-bold uppercase text-slate-600">' + esc(t('reserve.paymentMethod')) + '</label>' +
                '<div class="grid grid-cols-3 gap-2">' + methodButtons + '</div>' +
            '</div>' +
            '<div class="bg-slate-100 p-3 rounded-xl text-xs text-slate-600">' +
                esc(tt('reserve.notice', currentUser && currentUser.email ? currentUser.email : 'Guest Buyer', pool.hubLocation, pool.pickupDate)) +
            '</div>' +
            '<div class="flex justify-end gap-2 pt-2">' +
                '<button type="button" onclick="closeReserveModal()" class="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-100 transition">' + esc(t('common.cancel')) + '</button>' +
                '<button type="button" id="reserve-confirm-btn" onclick="confirmReservation()" class="px-6 py-2.5 rounded-xl bg-emerald-800 hover:bg-emerald-700 text-white text-xs font-black transition shadow-md">' + esc(tt('reserve.confirm', fmt(totalPrice))) + '</button>' +
            '</div>' +
        '</div>';
}

function reserveStep(delta) {
    if (!reserveState.pool) return;
    const maxShares = Math.max(1, reserveState.pool.targetShares - reserveState.pool.currentShares);
    reserveState.shares = Math.min(maxShares, Math.max(1, reserveState.shares + delta));
    renderReserveForm();
}

function setPayment(method) {
    reserveState.payment = method;
    renderReserveForm();
}

async function confirmReservation() {
    const pool = reserveState.pool;
    const shares = reserveState.shares;
    const payment = reserveState.payment;
    if (!pool) return;
    const confirmBtn = document.getElementById('reserve-confirm-btn');
    if (confirmBtn) {
        confirmBtn.disabled = true;
        confirmBtn.textContent = t('reserve.reserving');
    }
    try {
        const data = await api('/api/pools/' + pool.id + '/reserve', {
            method: 'POST',
            body: JSON.stringify({ shares: shares, paymentMethod: payment })
        });
        const updated = normalizePool(data.pool || pool);
        const idx = pools.findIndex(function (p) { return p.id === pool.id; });
        if (idx !== -1) pools[idx] = updated;
        renderPools();
        renderReserveSuccess(data.reservation || { shares: shares, paymentMethod: payment, voucherCode: 'NT-' + Math.floor(100000 + Math.random() * 900000) }, updated);
        showToast(tt('toast.reserved', data.reservation && data.reservation.shares ? data.reservation.shares : shares));
    } catch (err) {
        if (confirmBtn) {
            confirmBtn.disabled = false;
            confirmBtn.textContent = tt('reserve.confirm', fmt(pool.price * shares));
        }
        showToast(err.message, true);
    }
}

function copyVoucherCode(code) {
    const ok = function () { showToast(t('toast.copied')); };
    const fallback = function () {
        const ta = document.createElement('textarea');
        ta.value = code;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        try { document.execCommand('copy'); } catch (e) { /* clipboard fallback already handled */ }
        document.body.removeChild(ta);
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(code).then(ok, function () { fallback(); ok(); });
    } else {
        fallback();
        ok();
    }
}

function buildVoucherHTML(reservation, pool, closeFn) {
    const code = reservation.voucherCode || reservation.voucher_code || 'NT-' + Math.floor(100000 + Math.random() * 900000);
    const qr = 'https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=' + encodeURIComponent(code);
    const method = (reservation.paymentMethod || reservation.payment_method || 'telebirr').toUpperCase();
    const qty = reservation.shares || 1;
    const unit = pool.unit || t('pool.fallbackUnit');
    const hub = pool.hubLocation || pool.hub_location || (pool.town || 'Addis Ababa') + ' ' + t('pool.fallbackHubSuffix');
    const date = pool.pickupDate || pool.pickup_date || t('pool.fallbackPickup');
    const customer = currentUser && currentUser.email ? currentUser.email : '—';

    return '' +
        '<button onclick="' + closeFn + '()" class="absolute top-4 right-4 p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition not-printable" aria-label="' + esc(t('aria.close')) + '">' +
            '<svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>' +
        '</button>' +
        '<div class="voucher-print space-y-5 text-center py-2">' +
            '<div class="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">' +
                '<svg xmlns="http://www.w3.org/2000/svg" class="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>' +
            '</div>' +
            '<div>' +
                '<h3 class="text-xl font-black text-slate-900">' + esc(t('success.title')) + '</h3>' +
                '<p class="text-xs text-slate-500 mt-1">' + esc(tt('success.subtitle', pool.title)) + '</p>' +
            '</div>' +
            '<div class="bg-slate-50 border border-slate-200 rounded-3xl p-5 max-w-xs mx-auto space-y-3">' +
                '<div class="bg-white p-3 rounded-2xl shadow-inner w-36 h-36 mx-auto flex items-center justify-center border border-slate-200">' +
                    '<img src="' + esc(qr) + '" alt="' + esc(t('voucher.qrAlt')) + '" class="w-full h-full object-contain">' +
                '</div>' +
                '<div><p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">' + esc(t('success.ticketCode')) + '</p><p class="text-base font-black text-emerald-800 tracking-wider">' + esc(code) + '</p></div>' +
                '<div class="text-[11px] text-slate-600 space-y-1 text-left border-t border-slate-200 pt-3">' +
                    '<p>• <strong>' + esc(tt('success.qty', qty, unit)) + '</strong></p>' +
                    '<p>• <strong>' + esc(tt('success.hub', hub)) + '</strong></p>' +
                    '<p>• <strong>' + esc(tt('success.pickupDate', date)) + '</strong></p>' +
                    '<p>• <strong>' + esc(tt('success.method', method)) + '</strong></p>' +
                    '<p>• <strong>' + esc(t('voucher.customer')) + ':</strong> ' + esc(customer) + '</p>' +
                '</div>' +
            '</div>' +
            '<div class="flex justify-center gap-2 pt-1 not-printable">' +
                '<button type="button" onclick="copyVoucherCode(\'' + esc(code) + '\')" class="px-4 py-2.5 rounded-xl border border-emerald-200 text-emerald-800 text-xs font-black hover:bg-emerald-50 transition">' + esc(t('success.copy')) + '</button>' +
                '<button type="button" onclick="downloadPickupReminder(\'' + esc(pool.id) + '\')" class="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 text-xs font-black hover:bg-slate-100 transition">' + esc(t('card.calendar')) + '</button>' +
                '<button type="button" onclick="window.print()" class="px-4 py-2.5 rounded-xl bg-slate-900 text-white text-xs font-black hover:bg-slate-800 transition">' + esc(t('success.print')) + '</button>' +
                '<button type="button" onclick="' + closeFn + '()" class="px-6 py-2.5 rounded-xl bg-emerald-800 text-white text-xs font-black hover:bg-emerald-700 transition">' + esc(t('success.done')) + '</button>' +
            '</div>' +
        '</div>';
}

function renderReserveSuccess(reservation, pool) {
    const card = document.getElementById('reserve-modal-card');
    if (!card) return;
    window._voucherPool = pool;
    card.innerHTML = buildVoucherHTML(reservation, pool, 'closeReserveModal');
}

// ---------- Pickup Voucher Modal (My Reservations) ----------

function openVoucherModal(resId) {
    const res = myReservations.find(function (r) { return String(r.id) === String(resId); });
    if (!res) return;
    const pool = normalizePool(res.pool || {});
    window._voucherPool = pool;
    const card = document.getElementById('voucher-modal-card');
    if (!card) return;
    card.innerHTML = buildVoucherHTML(res, pool, 'closeVoucherModal');
    const modal = document.getElementById('voucher-modal');
    if (modal) {
        modal.classList.remove('hidden');
        modal.classList.add('flex');
    }
}

function closeVoucherModal() {
    const modal = document.getElementById('voucher-modal');
    if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }
}

// ---------- Pool Details Modal (Comments) ----------

async function openPoolDetails(id) {
    const pool = pools.find(function (p) { return p.id === String(id); });
    if (!pool) return;
    detailsState = { pool: pool, comments: [] };
    const modal = document.getElementById('details-modal');
    if (modal) {
        modal.classList.remove('hidden');
        modal.classList.add('flex');
    }
    renderDetails();
    try {
        const data = await api('/api/pools/' + pool.id + '/comments');
        detailsState.comments = data.comments || [];
        renderDetails();
    } catch (err) {
        console.error('Failed to fetch comments:', err.message);
    }
}

function closeDetailsModal() {
    const modal = document.getElementById('details-modal');
    if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }
}

function renderDetails() {
    const card = document.getElementById('details-modal-card');
    if (!card || !detailsState.pool) return;
    const pool = detailsState.pool;
    const percentage = Math.min(100, Math.round((pool.currentShares / pool.targetShares) * 100));
    const comments = detailsState.comments || [];

    const commentList = comments.length === 0
        ? '<p class="text-xs text-slate-400 text-center py-4">' + esc(t('details.noComments')) + '</p>'
        : comments.map(function (c) {
            const likes = Number(c.likes_count ?? c.likesCount ?? 0);
            const liked = !!(c.liked || c.userLiked);
            return '<div class="bg-slate-50 border border-slate-200 rounded-2xl p-3 text-xs space-y-1">' +
                '<div class="flex justify-between items-center font-bold">' +
                    '<span class="text-slate-800 flex items-center gap-1">' + esc(c.user_name || c.userName || t('details.neighborBuyer')) + ' (' + esc(localizeTown(c.user_town || 'Addis Ababa')) + ')' + (c.is_coordinator || c.isCoordinator ? '<span class="bg-emerald-100 text-emerald-800 text-[9px] px-1.5 py-0.5 rounded-md font-extrabold">' + esc(t('details.coordinator')) + '</span>' : '') + '</span>' +
                    '<span class="text-[10px] text-slate-400">' + esc(c.created_at || t('time.justNow')) + '</span>' +
                '</div>' +
                '<p class="text-slate-600">' + esc(c.text) + '</p>' +
                '<div class="flex justify-end pt-1">' +
                    '<button type="button" onclick="likeComment(\'' + esc(c.id) + '\', this)" class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full border text-[10px] font-bold transition ' + (liked ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-100') + '">' +
                        (liked ? '<svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor"><path d="M2 10.5a1.5 1.5 0 113 0v6a1.5 1.5 0 01-3 0v-6zM6 10.333v5.43a2 2 0 001.106 1.79l.05.025A4 4 0 008.943 18h5.416a2 2 0 001.962-1.608l1.2-6A2 2 0 0015.56 8H12V4a2 2 0 00-2-2 1 1 0 00-1 1v.667a4 4 0 01-.8 2.4L6.8 7.933a4 4 0 00-.8 2.4z"/></svg>' : '<svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M14 10h4.764a2 2 0 011.947 2.477l-1.4 6A2 2 0 0117.34 20H8m10 0v-6m0 0V6a2 2 0 00-2-2H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 012-2z"/></svg>') +
                        '<span>' + (liked ? esc(t('details.liked')) : esc(t('details.like'))) + '</span>' +
                        '<span data-like-count="' + esc(c.id) + '">' + (likes || '') + '</span>' +
                    '</button>' +
                '</div>' +
            '</div>';
        }).join('');

    card.innerHTML =
        '<button onclick="closeDetailsModal()" class="absolute top-4 right-4 p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition" aria-label="' + esc(t('aria.close')) + '">' +
            '<svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>' +
        '</button>' +
        '<div class="flex flex-col sm:flex-row gap-4 items-start">' +
            '<img src="' + esc(pool.imageUrl) + '" alt="' + esc(pool.title) + '" class="w-full sm:w-32 h-28 object-cover rounded-2xl border border-slate-200">' +
            '<div class="space-y-1 flex-1">' +
                '<div class="flex items-center gap-2">' +
                    '<span class="bg-emerald-100 text-emerald-800 text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full">' + esc(tt('card.hub', localizeTown(pool.town))) + '</span>' +
                    '<span class="text-xs text-slate-400 font-bold">' + esc(tt('details.origin', pool.woreda)) + '</span>' +
                '</div>' +
                '<h3 class="text-xl font-black text-slate-900">' + esc(pool.title) + '</h3>' +
                '<p class="text-xs text-slate-500">' + esc(tt('details.unit', pool.unit, pool.hubLocation)) + '</p>' +
                '<div class="pt-1 flex items-center gap-3">' +
                    '<span class="text-lg font-black text-emerald-800">' + fmt(pool.price) + ' ' + currencyUnit() + '</span>' +
                    '<span class="text-xs text-slate-400 line-through">' + fmt(pool.retailPrice) + ' ' + currencyUnit() + '</span>' +
                '</div>' +
            '</div>' +
        '</div>' +
        '<div class="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2">' +
            '<div class="flex justify-between items-center text-xs font-bold text-slate-700">' +
                '<span>' + esc(tt('details.progress', pool.currentShares, pool.targetShares)) + '</span><span>' + esc(tt('details.percentReserved', percentage)) + '</span>' +
            '</div>' +
            '<div class="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden">' +
                '<div class="bg-emerald-600 h-full rounded-full transition-all duration-500" style="width: ' + percentage + '%"></div>' +
            '</div>' +
            '<div class="flex justify-between text-xs text-slate-500">' +
                '<span>' + esc(tt('details.organizer', pool.organizer)) + '</span>' +
                '<button onclick="closeDetailsModal(); openReserveModal(\'' + pool.id + '\')" ' + (pool.locked || pool.currentShares >= pool.targetShares ? 'disabled' : '') + ' class="bg-emerald-800 hover:bg-emerald-700 text-white font-bold px-3 py-1 rounded-xl text-xs transition disabled:opacity-50">' + esc(t('details.reserve')) + '</button>' +
            '</div>' +
        '</div>' +
        '<div class="space-y-3 pt-2 border-t border-slate-100">' +
            '<h4 class="text-xs font-black uppercase text-slate-400 tracking-wider">' + esc(tt('details.board', comments.length)) + '</h4>' +
            '<form onsubmit="postComment(event)" class="flex gap-2">' +
                '<input type="text" id="comment-input" placeholder="' + esc(t('details.commentPh')) + '" class="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500">' +
                '<button type="submit" class="bg-emerald-800 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-xs font-bold transition">' + esc(t('details.post')) + '</button>' +
            '</form>' +
            '<div class="max-h-52 overflow-y-auto space-y-2 pr-1 scrollbar-thin">' + commentList + '</div>' +
        '</div>';
}

async function postComment(e) {
    e.preventDefault();
    if (!detailsState.pool) return;
    if (!currentUser) {
        showToast(t('toast.signinComment'));
        openAuthModal();
        return;
    }
    const input = document.getElementById('comment-input');
    const text = input.value.trim();
    if (!text) return;
    try {
        const data = await api('/api/pools/' + detailsState.pool.id + '/comments', {
            method: 'POST',
            body: JSON.stringify({ text: text })
        });
        if (data.comment) {
            detailsState.comments = [data.comment].concat(detailsState.comments);
            detailsState.pool.commentsCount = (detailsState.pool.commentsCount || 0) + 1;
            const badge = document.querySelector('[data-cc="' + detailsState.pool.id + '"]');
            if (badge) badge.textContent = detailsState.pool.commentsCount;
        }
        renderDetails();
        showToast(t('toast.commentPosted'));
    } catch (err) {
        showToast(err.message, true);
    }
}

async function likeComment(commentId, btn) {
    if (!currentUser) {
        showToast(t('toast.signinLike'));
        openAuthModal();
        return;
    }
    const prevLiked = btn.classList.contains('bg-emerald-50');
    const optimistic = function (liked, count) {
        if (liked) {
            btn.classList.add('bg-emerald-50', 'border-emerald-200', 'text-emerald-700');
            btn.classList.remove('bg-white', 'border-slate-200', 'text-slate-500');
        } else {
            btn.classList.add('bg-white', 'border-slate-200', 'text-slate-500');
            btn.classList.remove('bg-emerald-50', 'border-emerald-200', 'text-emerald-700');
        }
        const label = btn.querySelector('span:not([data-like-count])');
        if (label) label.textContent = liked ? t('details.liked') : t('details.like');
        const countEl = btn.querySelector('[data-like-count]');
        if (countEl) countEl.textContent = count > 0 ? count : '';
    };
    const cur = detailsState.comments.find(function (c) { return String(c.id) === String(commentId); });
    const curLikes = cur ? (Number(cur.likes_count ?? cur.likesCount ?? 0)) : 0;
    optimistic(!prevLiked, curLikes + (prevLiked ? -1 : 1));
    try {
        const data = await api('/api/comments/' + commentId + '/like', { method: 'POST' });
        optimistic(!!data.liked, Number(data.likes) || 0);
        if (cur) {
            cur.liked = !!data.liked;
            cur.likes_count = Number(data.likes) || 0;
        }
        showToast(data.liked ? t('details.likeToast') : t('details.unlikeToast'));
    } catch (err) {
        optimistic(prevLiked, curLikes);
        showToast(err.message, true);
    }
}

// ---------- Savings Calculator ----------

function calcInitQuantities() {
    const q = {};
    PRESET_SAVINGS_ITEMS.forEach(function (item) {
        q[item.key] = item.defaultKgPerMonth;
    });
    return q;
}

function renderCalculator() {
    const container = document.getElementById('calc-items');
    if (!container) return;
    if (Object.keys(calcQuantities).length === 0) {
        calcQuantities = calcInitQuantities();
    }

    container.innerHTML = PRESET_SAVINGS_ITEMS.map(function (item, idx) {
        const qty = calcQuantities[item.key] || 0;
        const itemRetail = qty * item.unitPriceRetail;
        const itemWholesale = qty * item.unitPriceWholesale;
        const itemSaved = itemRetail - itemWholesale;
        const fillPct = item.max > item.min ? Math.round(((qty - item.min) / (item.max - item.min)) * 100) : 50;
        const unitLabel = item.key === 'calc.item4' ? t('calc.unitsLitres') : t('calc.unitsKg');
        return '<div class="card-enter bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2" style="animation-delay: ' + (idx * 70) + 'ms">' +
            '<div class="flex justify-between items-center text-xs font-bold">' +
                '<span class="text-slate-800">' + esc(t(item.key)) + '</span>' +
                '<span class="text-emerald-700 font-extrabold">' + esc(tt('calc.month', qty, unitLabel)) + '</span>' +
            '</div>' +
            '<input type="range" min="' + item.min + '" max="' + item.max + '" step="1" value="' + qty + '" oninput="calcQuantityChange(this)" data-item="' + esc(item.key) + '" style="--fill: ' + fillPct + '%" class="w-full h-2 cursor-pointer">' +
            '<div class="flex justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-200">' +
                '<span>' + esc(tt('calc.groupRate', item.unitPriceWholesale)) + '</span>' +
                '<span>' + esc(tt('calc.retailMarket', item.unitPriceRetail)) + '</span>' +
                '<span class="text-emerald-600 font-bold">' + esc(tt('calc.saveItem', fmt(itemSaved))) + '</span>' +
            '</div>' +
        '</div>';
    }).join('');

    updateCalculatorSummary();
}

function calcQuantityChange(input) {
    calcQuantities[input.dataset.item] = Number(input.value);
    const min = Number(input.min);
    const max = Number(input.max);
    if (max > min) input.style.setProperty('--fill', Math.round(((input.value - min) / (max - min)) * 100) + '%');
    const valueLabel = input.parentElement.querySelector('span.text-emerald-700');
    if (valueLabel) {
        const item = PRESET_SAVINGS_ITEMS.find(function (it) { return it.key === input.dataset.item; });
        const unitLabel = item && item.key === 'calc.item4' ? t('calc.unitsLitres') : t('calc.unitsKg');
        valueLabel.textContent = tt('calc.month', input.value, unitLabel);
    }
    updateCalculatorSummary();
}

function updateCalculatorSummary() {
    let totalWholesale = 0;
    let totalRetail = 0;
    const rows = [];
    let maxCost = 0;
    PRESET_SAVINGS_ITEMS.forEach(function (item) {
        const qty = calcQuantities[item.key] || 0;
        const retailCost = qty * item.unitPriceRetail;
        const wholesaleCost = qty * item.unitPriceWholesale;
        totalWholesale += wholesaleCost;
        totalRetail += retailCost;
        rows.push({ item: item, retailCost: retailCost, wholesaleCost: wholesaleCost, saved: retailCost - wholesaleCost });
        if (retailCost > maxCost) maxCost = retailCost;
    });
    const monthly = totalRetail - totalWholesale;
    const annual = monthly * 12;
    const pct = totalRetail > 0 ? Math.round((monthly / totalRetail) * 100) : 0;

    const elMonthly = document.getElementById('calc-monthly-savings');
    const elSaveLine = document.getElementById('calc-save-percent-line');
    const elRetail = document.getElementById('calc-retail');
    const elWholesale = document.getElementById('calc-wholesale');
    const elAnnual = document.getElementById('calc-annual');
    if (elMonthly) elMonthly.textContent = fmt(monthly);
    if (elSaveLine) elSaveLine.textContent = tt('calc.savePercent', pct);
    if (elRetail) elRetail.textContent = fmt(totalRetail);
    if (elWholesale) elWholesale.textContent = fmt(totalWholesale);
    if (elAnnual) elAnnual.textContent = fmt(annual);

    [elMonthly, elAnnual].forEach(function (el) {
        if (el) {
            el.classList.remove('num-pop');
            void el.offsetWidth;
            el.classList.add('num-pop');
        }
    });
    const impactCard = document.getElementById('calc-impact-card');
    if (impactCard) {
        impactCard.classList.remove('impact-flash');
        void impactCard.offsetWidth;
        impactCard.classList.add('impact-flash');
    }

    const chart = document.getElementById('calc-chart');
    if (!chart) return;
    const scale = maxCost > 0 ? maxCost : 1;
    chart.innerHTML = rows.map(function (r) {
        const retailW = Math.max(2, Math.round((r.retailCost / scale) * 100));
        const groupW = Math.max(2, Math.round((r.wholesaleCost / scale) * 100));
        const itemSavePct = r.retailCost > 0 ? Math.round((r.saved / r.retailCost) * 100) : 0;
        return '<div class="bg-white border border-slate-200 rounded-2xl p-3">' +
            '<div class="flex justify-between items-center text-xs font-bold text-slate-800 mb-2">' +
                '<span>' + esc(t(r.item.key)) + '</span>' +
                '<span class="text-emerald-600">' + esc(tt('calc.saveItem', fmt(r.saved))) + ' (' + itemSavePct + '%)</span>' +
            '</div>' +
            '<div class="space-y-1.5">' +
                '<div class="flex items-center gap-2">' +
                    '<span class="w-24 shrink-0 text-[10px] font-bold text-slate-500 uppercase">' + esc(t('calc.chartRetail')) + '</span>' +
                    '<div class="flex-1 bg-slate-100 h-3 rounded-full overflow-hidden"><div class="bg-slate-800 h-3 rounded-full transition-all duration-500" style="width: ' + retailW + '%"></div></div>' +
                    '<span class="w-20 shrink-0 text-[10px] font-semibold text-slate-500 text-right">' + fmt(r.retailCost) + ' ' + currencyUnit() + '</span>' +
                '</div>' +
                '<div class="flex items-center gap-2">' +
                    '<span class="w-24 shrink-0 text-[10px] font-bold text-emerald-700 uppercase">' + esc(t('calc.chartGroup')) + '</span>' +
                    '<div class="flex-1 bg-slate-100 h-3 rounded-full overflow-hidden"><div class="bg-emerald-500 h-3 rounded-full transition-all duration-500" style="width: ' + groupW + '%"></div></div>' +
                    '<span class="w-20 shrink-0 text-[10px] font-semibold text-emerald-700 text-right">' + fmt(r.wholesaleCost) + ' ' + currencyUnit() + '</span>' +
                '</div>' +
            '</div>' +
        '</div>';
    }).join('');
}

function setFamilySize(size) {
    calcFamilySize = size;
    const multiplier = size / 4;
    const q = {};
    PRESET_SAVINGS_ITEMS.forEach(function (item) {
        q[item.key] = Math.round(item.defaultKgPerMonth * multiplier);
    });
    calcQuantities = q;
    document.querySelectorAll('.calc-family-btn').forEach(function (btn) {
        btn.classList.toggle('active', Number(btn.dataset.size) === size);
    });
    renderCalculator();
}

// ---------- Hub Map Tracker ----------

function renderHubs() {
    const selected = SUPPLY_HUBS.find(function (h) { return h.id === selectedHubId; }) || SUPPLY_HUBS[0];
    selectedHubId = selected.id;

    const list = document.getElementById('hub-list');
    if (list) {
        list.innerHTML = SUPPLY_HUBS.map(function (hub, idx) {
            const active = hub.id === selected.id;
            const localized = localizeHub(hub);
            return '<button onclick="selectHub(\'' + hub.id + '\')" style="animation-delay: ' + (idx * 60) + 'ms" class="card-enter w-full text-left p-4 rounded-2xl border transition-all duration-200 flex items-center justify-between ' + (active ? 'bg-emerald-800 text-white border-emerald-700 shadow-md' : 'bg-slate-50 border-slate-200 text-slate-800 hover:bg-slate-100') + '">' +
                '<div>' +
                    '<h4 class="text-sm font-bold flex items-center gap-1.5">' + esc(localized.name) + '</h4>' +
                    '<p class="text-xs mt-0.5 ' + (active ? 'text-emerald-100' : 'text-slate-500') + '">' + esc(localized.address) + '</p>' +
                '</div>' +
                '<span class="text-[10px] font-bold px-2 py-1 rounded-full ' + (active ? 'bg-white/20 text-white' : 'bg-emerald-100 text-emerald-800') + '">' + esc(tt('hubs.activePools', hub.activeDeliveriesCount)) + '</span>' +
            '</button>';
        }).join('');
    }

    const nodes = document.getElementById('hub-map-nodes');
    if (nodes) {
        nodes.innerHTML = SUPPLY_HUBS.map(function (hub) {
            const active = hub.id === selected.id;
            return '<button onclick="selectHub(\'' + hub.id + '\')" style="left: ' + hub.coordinates.x + '%; top: ' + hub.coordinates.y + '%;" class="absolute -translate-x-1/2 -translate-y-1/2 group focus:outline-none">' +
                '<div class="relative flex items-center justify-center p-2 rounded-full transition-transform ' + (active ? 'scale-125' : 'hover:scale-110') + '">' +
                    '<span class="absolute inset-0 rounded-full animate-ping opacity-75 ' + (active ? 'bg-emerald-500' : 'bg-teal-500') + '"></span>' +
                    '<div class="relative w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-black shadow-lg ' + (active ? 'bg-emerald-600 ring-4 ring-emerald-400/40' : 'bg-slate-800 border border-slate-600') + '">' + PIN_ICON + '</div>' +
                '</div>' +
                '<div class="absolute top-8 left-1/2 -translate-x-1/2 whitespace-nowrap px-2.5 py-1 rounded-xl text-[10px] font-bold shadow-lg transition ' + (active ? 'bg-emerald-600 text-white z-30' : 'bg-slate-900/90 text-slate-300 border border-slate-700') + '">' + esc(localizeTown(hub.town)) + '</div>' +
            '</button>';
        }).join('');
    }

    const townEl = document.getElementById('hub-town');
    const woredasEl = document.getElementById('hub-woredas');
    const nameEl = document.getElementById('hub-name');
    const addressEl = document.getElementById('hub-address');
    const originsEl = document.getElementById('hub-origins');
    const selectedLocalized = localizeHub(selected);
    if (townEl) townEl.textContent = localizeTown(selected.town);
    if (woredasEl) woredasEl.textContent = selectedLocalized.woredas.join(', ');
    if (nameEl) nameEl.textContent = tt('hubs.details', selectedLocalized.name);
    if (addressEl) addressEl.textContent = selectedLocalized.address;
    if (originsEl) originsEl.textContent = selectedLocalized.woredas.join(' • ');
}

function selectHub(id) {
    selectedHubId = id;
    renderHubs();
}

// ---------- AI Supply Assistant ----------

function renderMarkdown(text) {
    return esc(text)
        .replace(/^#{1,4}\s*(.+)$/gm, '<strong class="ai-heading">$1</strong>')
        .replace(/`([^`\n]+)`/g, '<code class="ai-code">$1</code>')
        .replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>')
        .replace(/__([^_\n]+)__/g, '<strong>$1</strong>')
        .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener" class="ai-link">$1</a>')
        .replace(/^[-*+]\s+(.+)$/gm, '<span class="ai-bullet">•</span> $1')
        .replace(/^(\d+)[.)]\s+(.+)$/gm, '<span class="ai-bullet">$1.</span> $2')
        .replace(/^---+$/gm, '<hr class="ai-hr">')
        .replace(/\*([a-zA-Z0-9][^*\n]*)\*/g, '<em>$1</em>');
}

function renderAiMessages() {
    const container = document.getElementById('ai-messages');
    if (!container) return;

    container.innerHTML = aiMessages.map(function (msg) {
        const isUser = msg.sender === 'user';
        return '<div class="flex items-start gap-3 ' + (isUser ? 'flex-row-reverse' : '') + '">' +
            '<div class="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold ' + (isUser ? 'bg-slate-900 text-white' : 'bg-emerald-800 text-white') + '">' +
                (isUser ? '<span class="text-[10px]">' + esc(t('ai.badgeYou')) + '</span>' : '<span class="text-[10px]">' + esc(t('ai.badgeAi')) + '</span>') +
            '</div>' +
            '<div class="max-w-[85%] rounded-3xl p-4 text-xs sm:text-sm leading-relaxed ' + (isUser ? 'bg-emerald-800 text-white rounded-tr-none' : 'bg-slate-50 border border-slate-200 text-slate-800 rounded-tl-none') + '">' +
                '<div class="whitespace-pre-wrap font-sans">' + renderMarkdown(msg.text) + '</div>' +
                '<p class="text-[10px] font-medium text-right mt-1 ' + (isUser ? 'text-emerald-200/80' : 'text-slate-400') + '">' + esc(msg.timestamp) + '</p>' +
            '</div>' +
        '</div>';
    }).join('');

    if (aiLoading) {
        container.insertAdjacentHTML('beforeend',
            '<div class="flex items-center gap-3">' +
                '<div class="w-8 h-8 rounded-full bg-emerald-800 text-white flex items-center justify-center text-xs"><span class="animate-pulse">' + esc(t('ai.badgeAi')) + '</span></div>' +
                '<div class="bg-slate-100 p-3 rounded-2xl rounded-tl-none text-xs text-slate-500 flex items-center gap-2">' +
                    '<span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>' + esc(t('ai.processing')) +
                '</div>' +
            '</div>');
    }

    container.scrollTop = container.scrollHeight;
}

function renderAiChips() {
    const chips = document.getElementById('ai-chips');
    if (!chips) return;
    chips.innerHTML = AI_QUICK_PROMPTS.map(function (qp, i) {
        const label = t(qp.labelKey);
        const prompt = t(qp.promptKey);
        return '<button onclick="sendQuickPrompt(this)"' + (aiLoading ? ' disabled' : '') + ' data-prompt="' + esc(prompt) + '" class="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-emerald-100 text-slate-700 text-xs font-semibold whitespace-nowrap transition border border-slate-200 disabled:opacity-50">💡 ' + esc(label) + '</button>';
    }).join('');
}

async function sendAiMessage(textToSend) {
    const input = document.getElementById('ai-input');
    const prompt = (textToSend || (input ? input.value : '')).trim();
    if (!prompt || aiLoading) return;

    aiMessages.push({
        id: 'user-' + Date.now(),
        sender: 'user',
        text: prompt,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    });
    if (input) input.value = '';
    aiLoading = true;
    renderAiMessages();
    renderAiChips();

    try {
        const data = await api('/api/ai-assistant', {
            method: 'POST',
            body: JSON.stringify({ prompt: prompt })
        });
        aiMessages.push({
            id: 'ai-' + Date.now(),
            sender: 'assistant',
            text: data.reply || t('ai.noResponse'),
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        });
    } catch (err) {
        aiMessages.push({
            id: 'err-' + Date.now(),
            sender: 'assistant',
            text: '⚠️ ' + t('ai.error') + ': ' + err.message,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        });
    } finally {
        aiLoading = false;
        renderAiMessages();
        renderAiChips();
    }
}

function sendQuickPrompt(btn) {
    sendAiMessage(btn.dataset.prompt);
}

function submitAiForm(e) {
    e.preventDefault();
    sendAiMessage();
}

function toggleAiFab() {
    const panel = document.getElementById('ai-fab-panel');
    if (!panel) return;
    const open = panel.classList.contains('hidden');
    panel.classList.toggle('hidden');
    const fab = document.getElementById('ai-fab');
    if (fab) fab.classList.toggle('ai-fab-open', open);
    if (open) {
        renderAiMessages();
        const input = document.getElementById('ai-input');
        if (input) input.focus();
    }
}

// ---------- My Reserved Shares ----------

async function loadMyShares() {
    const empty = document.getElementById('my-shares-empty');
    const grid = document.getElementById('my-shares-grid');
    if (!grid) return;

    if (!currentUser) {
        if (empty) {
            empty.innerHTML = '<p class="text-sm font-semibold">' + esc(t('myshares.signinFirst')) + '</p>' +
                '<button onclick="openAuthModal()" class="bg-emerald-800 text-white text-xs font-bold px-4 py-2 rounded-xl hover:bg-emerald-700 transition">' + esc(t('myshares.signinBtn')) + '</button>';
            empty.classList.remove('hidden');
        }
        if (grid) grid.innerHTML = '';
        return;
    }

    try {
        const data = await api('/api/reservations/mine');
        myReservations = data.reservations || [];
    } catch (err) {
        console.error('Failed to load reservations:', err.message);
        myReservations = [];
    }

    if (myReservations.length === 0) {
        if (empty) {
            empty.innerHTML = '<p class="text-sm font-semibold">' + esc(t('myshares.emptyTitle')) + '</p>' +
                '<button onclick="showTab(\'pools\')" class="bg-emerald-800 text-white text-xs font-bold px-4 py-2 rounded-xl hover:bg-emerald-700 transition">' + esc(t('myshares.browse')) + '</button>';
            empty.classList.remove('hidden');
        }
        grid.innerHTML = '';
        return;
    }

    if (empty) empty.classList.add('hidden');
    grid.innerHTML = myReservations.map(function (res) {
        const pool = res.pool || {};
        const code = res.voucher_code || res.voucherCode || 'NT-000000';
        const status = getReservationStatus(res);
        const badge = getStatusBadge(status);
        const method = (res.payment_method || res.paymentMethod || 'telebirr').toUpperCase();
        const created = res.created_at ? new Date(res.created_at).toLocaleDateString() : t('time.today');
        const pickup = res.pickup_date || res.pickupDate || '—';
        return '<div class="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col sm:flex-row gap-4 items-start sm:items-center">' +
            '<div class="w-20 h-20 bg-white p-2 rounded-xl border border-slate-200 flex items-center justify-center flex-shrink-0">' +
                '<img src="' + esc('https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=' + encodeURIComponent(code)) + '" alt="' + esc(t('voucher.qrAlt')) + '" class="w-full h-full object-contain">' +
            '</div>' +
            '<div class="space-y-1 text-xs flex-1 min-w-0">' +
                '<div class="flex flex-wrap items-center gap-2">' +
                    '<h4 class="font-extrabold text-slate-900 truncate">' + esc(pool.title || t('pool.fallbackGroupPool')) + '</h4>' +
                    badge +
                '</div>' +
                '<p class="text-slate-500 font-semibold">' + esc(tt('myshares.shares', res.shares || 1)) + ' • ' + esc(tt('myshares.method', method)) + '</p>' +
                '<p class="text-emerald-700 font-bold flex items-center gap-2">' + esc(tt('myshares.voucher', code)) +
                    '<button onclick="copyVoucherCode(\'' + esc(code) + '\')" class="text-[10px] font-bold px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 border border-slate-200 transition">' + esc(t('myshares.copy')) + '</button>' +
                '</p>' +
                '<p class="text-[10px] text-slate-400">' + esc(tt('myshares.hub', localizeTown(pool.town || ''))) + ' • ' + esc(tt('myshares.pickup', pickup)) + ' • ' + esc(tt('myshares.reservedOn', created)) + '</p>' +
            '</div>' +
            '<button onclick="openVoucherModal(' + res.id + ')" class="shrink-0 bg-emerald-800 text-white text-xs font-bold px-4 py-2 rounded-xl hover:bg-emerald-700 transition">' + esc(t('myshares.viewVoucher')) + '</button>' +
        '</div>';
    }).join('');
}

function getReservationStatus(res) {
    if (res.status === 'collected' || res.status === 'Completed') return 'collected';
    if (res.status === 'ready') return 'ready';
    if (res.status === 'active' || res.status === 'pending') return 'active';
    if (res.voucher_code || res.voucherCode) return 'active';
    return 'active';
}

// ---------- Create Pool ----------

function handleLaunchPool() {
    if (!currentUser) {
        showToast(t('toast.signinLaunch'));
        openAuthModal();
        return;
    }
    const modal = document.getElementById('pool-modal');
    if (modal) {
        modal.classList.remove('hidden');
        modal.classList.add('flex');
    }
}

function closeModal() {
    const modal = document.getElementById('pool-modal');
    if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }
}

async function handleCreatePool(e) {
    e.preventDefault();
    const newPoolData = {
        title: document.getElementById('item-name').value,
        category: document.getElementById('item-category').value,
        town: document.getElementById('item-town').value,
        woreda: document.getElementById('item-woreda').value,
        price: Number(document.getElementById('item-price').value),
        retailPrice: document.getElementById('item-retail').value ? Number(document.getElementById('item-retail').value) : undefined,
        unit: document.getElementById('item-unit').value || t('pool.fallbackBag'),
        targetShares: Number(document.getElementById('item-target').value),
        hubLocation: document.getElementById('item-hub').value || document.getElementById('item-town').value + ' ' + t('pool.fallbackHubSuffix'),
        organizer: document.getElementById('item-organizer').value || t('pool.fallbackOrganizer')
    };

    try {
        const data = await api('/api/pools', { method: 'POST', body: JSON.stringify(newPoolData) });
        pools.unshift(normalizePool(data.pool));
        closeModal();
        const form = document.getElementById('create-form');
        if (form) form.reset();
        renderCategoryPills();
        renderPools();
        showToast(t('toast.poolLaunched'));
    } catch (err) {
        showToast(t('toast.poolCreateError') + ': ' + err.message, true);
    }
}

// ---------- Auth ----------

function openAuthModal() {
    const modal = document.getElementById('auth-modal');
    if (modal) {
        modal.classList.remove('hidden');
        modal.classList.add('flex');
    }
}

function closeAuthModal() {
    const modal = document.getElementById('auth-modal');
    if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }
}

function toggleAuthMode(isSignup) {
    authMode = isSignup ? 'signup' : 'signin';
    const title = document.getElementById('auth-modal-title');
    const submitBtn = document.getElementById('auth-submit-btn');
    const tabSignin = document.getElementById('auth-tab-signin');
    const tabSignup = document.getElementById('auth-tab-signup');
    const message = document.getElementById('auth-message');
    const nameField = document.getElementById('auth-name-field');
    const usernameField = document.getElementById('auth-username-field');

    if (message) { message.classList.add('hidden'); message.textContent = ''; }
    if (title) title.textContent = t(isSignup ? 'auth.signup' : 'auth.signin');
    if (submitBtn) submitBtn.textContent = t(isSignup ? 'auth.signup' : 'auth.signin');
    if (nameField) nameField.classList.toggle('hidden', !isSignup);
    if (usernameField) usernameField.classList.toggle('hidden', !isSignup);
    syncAuthFields();
    if (tabSignin) {
        tabSignin.className = 'flex-1 pb-2 text-center text-sm font-' + (isSignup ? 'medium border-b-2 border-transparent text-slate-500 hover:text-slate-800' : 'bold border-b-2 border-emerald-600 text-emerald-800');
    }
    if (tabSignup) {
        tabSignup.className = 'flex-1 pb-2 text-center text-sm font-' + (isSignup ? 'bold border-b-2 border-emerald-600 text-emerald-800' : 'medium border-b-2 border-transparent text-slate-500 hover:text-slate-800');
    }
}

function syncAuthFields() {
    const label = document.getElementById('auth-email-label');
    const input = document.getElementById('auth-email');
    const isSignup = authMode === 'signup';
    if (label) label.textContent = t(isSignup ? 'auth.email' : 'auth.emailOrUser');
    if (input) {
        input.placeholder = t(isSignup ? 'auth.emailPh' : 'auth.emailOrUserPh');
        input.type = isSignup ? 'email' : 'text';
        input.required = true;
    }
}

function showAuthError(message, text) {
    if (!message) return;
    message.textContent = text;
    message.className = 'text-sm font-medium p-3 rounded-lg text-center bg-red-50 text-red-700';
    message.classList.remove('hidden');
}

async function handleAuthSubmit(e) {
    e.preventDefault();
    const email = document.getElementById('auth-email').value;
    const password = document.getElementById('auth-password').value;
    const nameEl = document.getElementById('auth-name');
    const usernameEl = document.getElementById('auth-username');
    const name = nameEl ? nameEl.value : '';
    const username = usernameEl ? usernameEl.value : '';
    const message = document.getElementById('auth-message');
    const isSignup = authMode === 'signup';

    if (isSignup && !name.trim()) {
        showAuthError(message, t('auth.nameRequired'));
        return;
    }
    if (isSignup && !username.trim()) {
        showAuthError(message, t('auth.usernameRequired'));
        return;
    }

    try {
        const endpoint = isSignup ? '/api/auth/signup' : '/api/auth/login';
        const payload = isSignup
            ? { email: email, password: password, name: name.trim(), username: username.trim() }
            : { email: email, password: password };
        const data = await api(endpoint, {
            method: 'POST',
            body: JSON.stringify(payload),
        });
        if (isSignup && !data.session) {
            e.target.reset();
            if (message) {
                message.textContent = t('auth.checkEmail');
                message.className = 'text-sm font-medium p-3 rounded-lg text-center bg-emerald-50 text-emerald-700';
                message.classList.remove('hidden');
            }
            return;
        }
        if (data.session && data.session.access_token) {
            localStorage.setItem('sb-access-token', data.session.access_token);
        }
        currentUser = data.user;
        updateAuthUI();
        closeAuthModal();
        e.target.reset();
        showToast(t(isSignup ? 'auth.created' : 'auth.signedIn'));
    } catch (err) {
        showAuthError(message, err.message);
    }
}

async function handleLogout() {
    try { await api('/api/auth/logout', { method: 'POST' }); } catch (e) { /* ignore */ }
    localStorage.removeItem('sb-access-token');
    currentUser = null;
    updateAuthUI();
    fetchPools();
    showToast(t('toast.signedOut'));
}

function updateAuthUI() {
    const authBtn = document.getElementById('open-auth-btn');
    const userMenu = document.getElementById('user-menu');
    const userEmail = document.getElementById('user-email');

    if (currentUser) {
        if (authBtn) authBtn.classList.add('hidden');
        if (userMenu) userMenu.classList.remove('hidden');
        if (userEmail) userEmail.textContent = currentUser.name || currentUser.username || currentUser.email || currentUser.user_metadata?.email || '';
    } else {
        if (authBtn) authBtn.classList.remove('hidden');
        if (userMenu) userMenu.classList.add('hidden');
    }
}

// ---------- Countdown ----------

function initCountdown() {
    const timerEl = document.getElementById('countdown-timer');
    if (!timerEl) return;

    const deadline = new Date();
    deadline.setDate(deadline.getDate() + 20);
    deadline.setHours(0, 0, 0, 0);

    function updateCountdown() {
        const now = new Date();
        const diff = deadline - now;
        if (diff <= 0) {
            timerEl.textContent = '00 : 00 : 00 : 00';
            return;
        }
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        timerEl.textContent = String(days).padStart(2, '0') + ' : ' + String(hours).padStart(2, '0') + ' : ' + String(minutes).padStart(2, '0') + ' : ' + String(seconds).padStart(2, '0');
    }

    updateCountdown();
    setInterval(updateCountdown, 1000);
}

// ---------- Pool Card Live Countdown ----------

function formatCountdownLeft(ms) {
    if (ms <= 0) return '00:00:00';
    const h = Math.floor(ms / (1000 * 60 * 60));
    const m = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
    const s = Math.floor((ms % (1000 * 60)) / 1000);
    if (h >= 48) {
        return Math.floor(h / 24) + t('time.d') + ' ' + String(Math.floor((h % 24))).padStart(2, '0') + t('time.h');
    }
    return String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
}

function startPoolCountdowns() {
    if (window._poolCountdownTimer) return;
    function tick() {
        const els = document.querySelectorAll('[data-countdown]');
        els.forEach(function (el) {
            const end = Number(el.getAttribute('data-countdown'));
            const left = end - Date.now();
            el.textContent = left <= 0 ? t('card.endsToday') : tt('card.countdownEnds', formatCountdownLeft(left));
        });
    }
    tick();
    window._poolCountdownTimer = setInterval(tick, 1000);
}

// ---------- Share Pool ----------

function sharePool(poolId, event) {
    if (event && event.stopPropagation) event.stopPropagation();
    const pool = pools.find(function (p) { return p.id === String(poolId); });
    if (!pool) return;
    const url = window.location.origin + window.location.pathname + '?pool=' + pool.id;
    const title = pool.title + ' — ' + fmt(pool.price) + ' ' + currencyUnit();
    const text = t('card.share') + ': ' + pool.title + ' • ' + localizeTown(pool.town) + ' • ' + fmt(pool.price) + ' ' + currencyUnit();

    // Use the native share sheet only on touch/mobile devices. On desktop the
    // OS share dialog is confusing (it can open a blank page), so we show the
    // in-app Telegram / WhatsApp / Copy menu instead.
    const coarsePointer = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
    if (coarsePointer && navigator.share) {
        if (navigator.canShare && !navigator.canShare({ title: title, text: text, url: url })) {
            openShareMenu(pool, url, title, text);
            return;
        }
        navigator.share({ title: title, text: text, url: url }).catch(function () { /* user cancelled */ });
        return;
    }

    openShareMenu(pool, url, title, text);
}

function openShareMenu(pool, url, title, text) {
    const menu = document.getElementById('share-menu');
    if (!menu) return;
    menu.classList.remove('hidden');
    menu.classList.add('flex');
    menu.querySelector('[data-share-title]').textContent = pool.title;
    menu.querySelector('[data-share-telegram]').setAttribute('href',
        'https://t.me/share/url?url=' + encodeURIComponent(url) + '&text=' + encodeURIComponent(text));
    menu.querySelector('[data-share-whatsapp]').setAttribute('href',
        'https://wa.me/?text=' + encodeURIComponent(text + ' ' + url));
    menu.querySelector('[data-share-copy]').setAttribute('data-copy-url', url);
}

function closeShareMenu() {
    const menu = document.getElementById('share-menu');
    if (menu) {
        menu.classList.add('hidden');
        menu.classList.remove('flex');
    }
}

function copyShareLink(el) {
    const url = el.getAttribute('data-copy-url') || window.location.href;
    const fallback = function () {
        const ta = document.createElement('textarea');
        ta.value = url;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        try { document.execCommand('copy'); } catch (e) { /* clipboard fallback */ }
        document.body.removeChild(ta);
        showToast(t('card.shareToast'));
        closeShareMenu();
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(url).then(function () {
            showToast(t('card.shareToast'));
            closeShareMenu();
        }, fallback);
    } else {
        fallback();
    }
}

// ---------- Pickup Reminder (.ics) ----------

function downloadPickupReminder(poolId) {
    const pool = pools.find(function (p) { return p.id === String(poolId); })
        || (window._voucherPool && String(window._voucherPool.id) === String(poolId) ? window._voucherPool : null);
    if (!pool) return;
    const base = new Date(pool.endsAt);
    const end = new Date(base.getTime() + 60 * 60 * 1000);
    const fmtIcs = function (d) {
        return d.getUTCFullYear() +
            String(d.getUTCMonth() + 1).padStart(2, '0') +
            String(d.getUTCDate()).padStart(2, '0') + 'T' +
            String(d.getUTCHours()).padStart(2, '0') +
            String(d.getUTCMinutes()).padStart(2, '0') + '00Z';
    };
    const ics = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//NuroTewedede//Pickup Reminder//EN',
        'BEGIN:VEVENT',
        'UID:nt-pickup-' + pool.id + '-' + Date.now() + '@nurotewedede',
        'DTSTAMP:' + fmtIcs(new Date()),
        'DTSTART:' + fmtIcs(base),
        'DTEND:' + fmtIcs(end),
        'SUMMARY:' + esc(t('success.title')) + ' — ' + pool.title,
        'DESCRIPTION:' + tt('card.pickup', pool.pickupDate) + ' • ' + (pool.hubLocation || '') + ' • ' + fmt(pool.price) + ' ' + currencyUnit(),
        'LOCATION:' + (pool.hubLocation || localizeTown(pool.town)),
        'END:VEVENT',
        'END:VCALENDAR'
    ].join('\r\n');
    const blob = new Blob([ics], { type: 'text/calendar' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'nurotewedede-pickup-' + pool.id + '.ics';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(function () { URL.revokeObjectURL(link.href); }, 2000);
    showToast(t('card.calendar'));
}

// ---------- Boot ----------

function populateTownSelects() {
    const formSelect = document.getElementById('item-town');
    const bulkSelect = document.getElementById('bulk-town');
    const prevF = formSelect ? formSelect.value : '';
    const prevB = bulkSelect ? bulkSelect.value : '';

    const optionHtml = ETHIOPIAN_TOWNS.map(function (t) {
        return '<option value="' + esc(t) + '">' + esc(localizeTown(t)) + '</option>';
    }).join('');

    if (formSelect) formSelect.innerHTML = optionHtml;
    if (bulkSelect) bulkSelect.innerHTML = optionHtml;
    if (formSelect) formSelect.value = prevF;
    if (bulkSelect) bulkSelect.value = prevB;

    ['town-dropdown-menu', 'town-dropdown-mobile-menu'].forEach(function (menuId) {
        const menu = document.getElementById(menuId);
        if (!menu) return;
        menu.innerHTML =
            '<button type="button" class="town-option w-full flex items-center gap-2 px-3 py-2 text-left text-xs font-bold text-slate-700 hover:bg-emerald-50 transition" data-value="All" onclick="selectTownFromDropdown(this.dataset.value, event)" role="option">' + esc(t('pools.allTowns')) + '</button>' +
            ETHIOPIAN_TOWNS.map(function (tn) {
                return '<button type="button" class="town-option w-full flex items-center gap-2 px-3 py-2 text-left text-xs font-bold text-slate-700 hover:bg-emerald-50 transition" data-value="' + esc(tn) + '" onclick="selectTownFromDropdown(this.dataset.value, event)" role="option">' + esc(localizeTown(tn)) + '</button>';
            }).join('');
    });
    syncTownDropdowns();
}

function syncTownDropdowns() {
    const labels = ['town-current-label', 'town-current-label-mobile'];
    labels.forEach(function (id) {
        const el = document.getElementById(id);
        if (el) el.textContent = currentFilter === 'All' ? t('pools.allTowns') : localizeTown(currentFilter);
    });
    document.querySelectorAll('.town-option').forEach(function (opt) {
        opt.classList.toggle('town-option-active', opt.dataset.value === currentFilter);
    });
}

function toggleTownDropdown(ddId, e) {
    if (e) e.stopPropagation();
    const menu = document.getElementById(ddId + '-menu');
    const btn = document.getElementById(ddId + '-btn');
    if (!menu) return;
    const open = menu.classList.toggle('hidden');
    if (btn) btn.setAttribute('aria-expanded', String(!open));
    if (!open) {
        ['town-dropdown-menu', 'town-dropdown-mobile-menu'].forEach(function (id) {
            if (id !== ddId + '-menu') {
                const other = document.getElementById(id);
                if (other) other.classList.add('hidden');
            }
        });
    }
}

function closeTownDropdowns() {
    ['town-dropdown', 'town-dropdown-mobile'].forEach(function (ddId) {
        const menu = document.getElementById(ddId + '-menu');
        const btn = document.getElementById(ddId + '-btn');
        if (menu) menu.classList.add('hidden');
        if (btn) btn.setAttribute('aria-expanded', 'false');
    });
}

function selectTownFromDropdown(value, e) {
    if (e) e.stopPropagation();
    setTown(value);
    closeTownDropdowns();
}

// ---------- Produce Type Dropdown (categorized) ----------

function produceLabel(entry) {
    return (entry.label && entry.label[appLang]) || (entry.label && entry.label.en) || '';
}

function renderProduceDropdown() {
    const btnLabel = document.getElementById('produce-current-label');
    if (btnLabel) btnLabel.textContent = currentProduce ? produceLabel(currentProduce) : t('pools.allProducts');

    const menu = document.getElementById('produce-dropdown-menu');
    if (!menu) return;

    let html =
        '<button type="button" onclick="setProduce(null, event)" class="produce-option w-full flex items-center justify-between px-3 py-2 text-left text-xs font-black ' + (!currentProduce ? 'produce-option-active' : '') + '" role="option" aria-selected="' + (!currentProduce) + '">' +
            '<span>' + esc(t('pools.allProducts')) + '</span>' +
            '<svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4"/></svg>' +
        '</button>' +
        '<div class="menu-divider mx-3 my-1 border-t"></div>';

    PRODUCE_GROUPS.forEach(function (group) {
        const groupActive = !currentProduce && currentCategory === group.category && group.category !== null;
        html +=
            '<button type="button" onclick="setCategoryGroup(\'' + esc(group.category || '') + '\', event)" class="w-full flex items-center justify-between px-3 pt-2.5 pb-1.5 text-left text-[10px] font-black uppercase tracking-wider text-slate-400 hover:text-emerald-700 transition ' + (groupActive ? 'text-emerald-700' : '') + '">' +
                '<span>' + esc(produceLabel(group)) + '</span>' +
                '<svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3"><path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7"/></svg>' +
            '</button>';
        group.items.forEach(function (item) {
            const active = currentProduce && currentProduce.id === item.id;
            html +=
                '<button type="button" onclick="setProduce(\'' + item.id + '\', event)" class="produce-option w-full flex items-center gap-2 px-3 py-2 text-left text-xs font-bold text-slate-600 hover:bg-emerald-50 hover:text-emerald-800 transition ' + (active ? 'produce-option-active' : '') + '" role="option" aria-selected="' + !!active + '">' +
                    '<svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5 shrink-0 text-emerald-500/70" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 3c2 3 5 4 5 9a5 5 0 01-10 0c0-5 3-6 5-9z"/></svg>' +
                    '<span>' + esc(produceLabel(item)) + '</span>' +
                '</button>';
        });
        html += '<div class="menu-divider mx-3 my-1 border-t"></div>';
    });

    menu.innerHTML = html;
}

function setProduce(id, e) {
    if (e) e.stopPropagation();
    if (!id) {
        currentProduce = null;
        currentCategory = 'All';
    } else {
        for (var i = 0; i < PRODUCE_GROUPS.length; i++) {
            var group = PRODUCE_GROUPS[i];
            for (var j = 0; j < group.items.length; j++) {
                if (group.items[j].id === id) {
                    currentProduce = group.items[j];
                    currentCategory = group.category || 'All';
                    break;
                }
            }
        }
    }
    renderProduceDropdown();
    renderCategoryPills();
    renderPools();
    closeProduceDropdown();
}

function setCategoryGroup(category, e) {
    if (e) e.stopPropagation();
    setCategory(category || 'All');
    closeProduceDropdown();
}

function toggleProduceDropdown(e) {
    if (e) e.stopPropagation();
    const menu = document.getElementById('produce-dropdown-menu');
    const btn = document.getElementById('produce-dropdown-btn');
    if (!menu) return;
    const open = menu.classList.toggle('hidden');
    if (btn) btn.setAttribute('aria-expanded', String(!open));
    if (!open) {
        closeTownDropdowns();
        const other = document.getElementById('town-dropdown-menu');
        if (other) other.classList.add('hidden');
    }
    renderProduceDropdown();
}

function closeProduceDropdown() {
    const menu = document.getElementById('produce-dropdown-menu');
    const btn = document.getElementById('produce-dropdown-btn');
    if (menu) menu.classList.add('hidden');
    if (btn) btn.setAttribute('aria-expanded', 'false');
}

// ---------- Scroll FX: progress bar, header state, back-to-top ----------

function initScrollFX() {
    const progress = document.getElementById('scroll-progress');
    const header = document.getElementById('site-header');
    const toTop = document.getElementById('back-to-top');

    function onScroll() {
        const doc = document.documentElement;
        const max = Math.max(doc.scrollHeight - doc.clientHeight, 1);
        const pct = Math.min(100, (window.scrollY / max) * 100);
        if (progress) progress.style.width = pct + '%';
        if (header) header.classList.toggle('header-scrolled', window.scrollY > 8);
        if (toTop) toTop.classList.toggle('visible', window.scrollY > 600);
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    if (toTop) {
        toTop.addEventListener('click', function () {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    }
}

// ---------- Scroll reveal animations ----------

function initReveals() {
    if (!('IntersectionObserver' in window)) {
        document.querySelectorAll('[data-reveal]').forEach(function (el) {
            el.classList.add('revealed');
        });
        return;
    }
    const io = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
            if (entry.isIntersecting) {
                entry.target.classList.add('revealed');
                io.unobserve(entry.target);
            }
        });
    }, { threshold: 0.12, rootMargin: '0px 0px -36px 0px' });
    document.querySelectorAll('[data-reveal]').forEach(function (el) {
        if (!el.classList.contains('revealed')) io.observe(el);
    });
}

function init() {
    initTheme();
    applyI18n();
    initCountdown();
    populateTownSelects();
    renderProduceDropdown();
    initScrollFX();
    initReveals();

    document.querySelectorAll('.tab-btn, .mobile-tab-btn').forEach(function (btn) {
        btn.addEventListener('click', function () {
            if (btn.dataset.tab) showTab(btn.dataset.tab);
        });
    });

    document.querySelectorAll('.menu-item').forEach(function (btn) {
        btn.addEventListener('click', function () {
            if (btn.dataset.menu) handleMenuAction(btn.dataset.menu);
        });
    });

    showTab('pools', true);

    const mobileToggle = document.getElementById('mobile-menu-toggle');
    if (mobileToggle) mobileToggle.addEventListener('click', toggleMobileMenu);

    const searchInput = document.getElementById('search-input');
    if (searchInput) {
        searchInput.addEventListener('input', function (e) {
            currentSearchQuery = e.target.value;
            renderPools();
        });
    }

    const sortSelect = document.getElementById('sort-select');
    if (sortSelect) {
        sortSelect.addEventListener('change', function (e) {
            currentSort = e.target.value;
            renderPools();
        });
    }

    document.querySelectorAll('.calc-family-btn').forEach(function (btn) {
        btn.addEventListener('click', function () {
            setFamilySize(Number(btn.dataset.size));
        });
    });

    const aiForm = document.getElementById('ai-form');
    if (aiForm) aiForm.addEventListener('submit', submitAiForm);

    const closeAuthBtn = document.getElementById('close-auth-modal');
    if (closeAuthBtn) closeAuthBtn.addEventListener('click', closeAuthModal);

    const userMenuBtn = document.getElementById('user-menu-btn');
    if (userMenuBtn) userMenuBtn.addEventListener('click', toggleUserMenu);

    document.addEventListener('click', function (e) {
        const dropdown = document.getElementById('user-dropdown');
        const btn = document.getElementById('user-menu-btn');
        if (dropdown && !dropdown.classList.contains('hidden') && btn && !btn.contains(e.target) && !dropdown.contains(e.target)) {
            dropdown.classList.add('hidden');
        }
        const langDD = document.getElementById('lang-dropdown');
        const langMenu = document.getElementById('lang-dropdown-menu');
        if (langDD && langMenu && !langMenu.classList.contains('hidden') && !langDD.contains(e.target)) {
            closeLangDropdown();
        }
        const menuDD = document.getElementById('menu-dropdown');
        const menuMenu = document.getElementById('menu-dropdown-menu');
        if (menuDD && menuMenu && !menuMenu.classList.contains('hidden') && !menuDD.contains(e.target)) {
            closeMenuDropdown();
        }
        const townDD = document.getElementById('town-dropdown');
        const townMenu = document.getElementById('town-dropdown-menu');
        if (townDD && townMenu && !townMenu.classList.contains('hidden') && !townDD.contains(e.target)) {
            closeTownDropdowns();
        }
        const townDDm = document.getElementById('town-dropdown-mobile');
        const townMenum = document.getElementById('town-dropdown-mobile-menu');
        if (townDDm && townMenum && !townMenum.classList.contains('hidden') && !townDDm.contains(e.target)) {
            closeTownDropdowns();
        }
        const prodDD = document.getElementById('produce-dropdown');
        const prodMenu = document.getElementById('produce-dropdown-menu');
        if (prodDD && prodMenu && !prodMenu.classList.contains('hidden') && !prodDD.contains(e.target)) {
            closeProduceDropdown();
        }
    });

    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') {
            closeLangDropdown();
            closeMenuDropdown();
            closeTownDropdowns();
            closeProduceDropdown();
            closeShareMenu();
            const dropdown = document.getElementById('user-dropdown');
            if (dropdown) dropdown.classList.add('hidden');
        }
    });

    const poolModal = document.getElementById('pool-modal');
    const reserveModal = document.getElementById('reserve-modal');
    const detailsModal = document.getElementById('details-modal');
    const authModal = document.getElementById('auth-modal');

    function modalBackdropClick(modal, closer) {
        if (!modal) return;
        modal.addEventListener('click', function (e) {
            if (e.target === modal) closer();
        });
    }
    modalBackdropClick(poolModal, closeModal);
    modalBackdropClick(reserveModal, closeReserveModal);
    modalBackdropClick(detailsModal, closeDetailsModal);
    modalBackdropClick(authModal, closeAuthModal);
    modalBackdropClick(document.getElementById('share-menu'), closeShareMenu);

    renderCalculator();
    renderHubs();
    renderAiChips();
    renderAiMessages();
    startPoolCountdowns();

    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('sw.js').catch(function (err) {
            console.warn('Service worker registration failed:', err);
        });
    }

    api('/api/auth/me')
        .then(function (data) {
            currentUser = data.user || null;
        })
        .catch(function () {
            currentUser = null;
        })
        .then(function () {
            updateAuthUI();
            fetchPools();
        });
}

// ---------- Bulk Order Portal ----------

function openBulkModal() {
    const modal = document.getElementById('bulk-modal');
    if (!modal) return;
    const summary = document.getElementById('bulk-summary');
    const success = document.getElementById('bulk-success');
    const form = document.getElementById('bulk-form');
    const grid = document.getElementById('bulk-catalog');
    if (summary) summary.classList.add('hidden');
    if (success) success.classList.add('hidden');
    if (form) form.classList.remove('hidden');
    if (grid) renderBulkCatalog(grid);
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    document.body.style.overflow = 'hidden';
    updateBulkSummary();
}

function closeBulkModal() {
    const modal = document.getElementById('bulk-modal');
    if (!modal) return;
    modal.classList.add('hidden');
    modal.classList.remove('flex');
    document.body.style.overflow = '';
}

function renderBulkCatalog(grid) {
    if (!grid) return;
    const items = [
        { name: t('bulk.prodTeff'), unit: t('calc.unitsKg'), wholesale: 96, retail: 144 },
        { name: t('bulk.prodOnions'), unit: t('calc.unitsKg'), wholesale: 54, retail: 88 },
        { name: t('bulk.prodCoffee'), unit: t('calc.unitsKg'), wholesale: 290, retail: 450 },
        { name: t('bulk.prodOil'), unit: t('calc.unitsLitres'), wholesale: 155, retail: 210 },
        { name: t('bulk.prodLentils'), unit: t('calc.unitsKg'), wholesale: 168, retail: 236 }
    ];
    grid.innerHTML = items.map(function (it) {
        return '<div class="bg-white border border-slate-200 rounded-xl p-3 text-center space-y-1">' +
            '<h4 class="text-xs font-extrabold text-slate-800">' + esc(it.name) + '</h4>' +
            '<p class="text-[10px] text-slate-500">' + esc(it.wholesale) + ' ' + currencyUnit() + '/' + esc(it.unit) + '</p>' +
            '<p class="text-[10px] text-slate-400 line-through">' + esc(it.retail) + ' ' + currencyUnit() + ' ' + esc(t('bulk.retailTag')) + '</p>' +
        '</div>';
    }).join('');
}

function updateBulkSummary() {
    const card = document.getElementById('bulk-summary');
    if (!card) return;
    const qty = Number(document.getElementById('bulk-qty') ? document.getElementById('bulk-qty').value : 0) || 0;
    const produceEl = document.getElementById('bulk-produce');
    const produce = produceEl ? produceEl.value : '';
    const wholesaleMap = {
        'Teff': 96, 'Onions': 54, 'Coffee': 290, 'Oil': 155, 'Lentils': 168
    };
    const retailMap = {
        'Teff': 144, 'Onions': 88, 'Coffee': 450, 'Oil': 210, 'Lentils': 236
    };
    const wholesale = wholesaleMap[produce] || 0;
    const retail = retailMap[produce] || 0;
    const totalWholesale = wholesale * qty;
    const totalRetail = retail * qty;
    const saved = totalRetail - totalWholesale;
    if (qty > 0) card.classList.remove('hidden');
    else card.classList.add('hidden');
    card.innerHTML = '<div class="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2 text-xs">' +
        '<div class="flex justify-between font-bold text-slate-700"><span>' + esc(t('bulk.estQty')) + '</span><span>' + qty + ' ' + (produce === 'Oil' ? t('calc.unitsLitres') : t('calc.unitsKg')) + '</span></div>' +
        '<div class="flex justify-between font-bold text-slate-700"><span>' + esc(t('bulk.estWholesale')) + '</span><span>' + fmt(totalWholesale) + ' ' + currencyUnit() + '</span></div>' +
        '<div class="flex justify-between font-bold text-slate-400"><span>' + esc(t('bulk.estRetail')) + '</span><span class="line-through">' + fmt(totalRetail) + ' ' + currencyUnit() + '</span></div>' +
        '<div class="flex justify-between font-black text-emerald-700 border-t border-slate-200 pt-2"><span>' + esc(t('bulk.estSave')) + '</span><span>' + fmt(saved) + ' ' + currencyUnit() + '</span></div>' +
        '<p class="text-[10px] text-slate-400">' + esc(t('bulk.disclaimer')) + '</p>' +
    '</div>';
}

function handleBulkSubmit(e) {
    e.preventDefault();
    const business = document.getElementById('bulk-business');
    const contact = document.getElementById('bulk-contact');
    const phone = document.getElementById('bulk-phone');
    const qty = document.getElementById('bulk-qty');
    if (!business || !contact || !qty) return;
    if (!business.value.trim() || !contact.value.trim()) {
        showToast(t('bulk.required'));
        return;
    }
    const code = 'NT-BLK-' + String(Date.now()).slice(-6);
    const ref = document.getElementById('bulk-ref');
    if (ref) ref.textContent = code;
    const success = document.getElementById('bulk-success');
    if (success) success.classList.remove('hidden');
    const form = document.getElementById('bulk-form');
    if (form) form.classList.add('hidden');
    const summary = document.getElementById('bulk-summary');
    if (summary) summary.classList.add('hidden');
    const title = document.getElementById('bulk-success-title');
    if (title) title.textContent = tt('bulk.successTitle', code);
    showToast(tt('toast.bulkSubmitted', code));
    if (qty) qty.value = '';
    if (phone) phone.value = '';
    if (business) business.value = '';
    if (contact) contact.value = '';
    const note = document.getElementById('bulk-note');
    if (note) note.value = '';
    const produce = document.getElementById('bulk-produce');
    if (produce) produce.value = 'Teff';
}

// Expose functions globally for HTML inline event handlers
window.toggleTheme = toggleTheme;
window.showTab = showTab;
window.toggleMobileMenu = toggleMobileMenu;
window.toggleUserMenu = toggleUserMenu;
window.filterTown = setTown;
window.setCategory = setCategory;
window.setTown = setTown;
window.openReserveModal = openReserveModal;
window.closeReserveModal = closeReserveModal;
window.reserveStep = reserveStep;
window.setPayment = setPayment;
window.confirmReservation = confirmReservation;
window.openPoolDetails = openPoolDetails;
window.closeDetailsModal = closeDetailsModal;
window.postComment = postComment;
window.calcQuantityChange = calcQuantityChange;
window.selectHub = selectHub;
window.sendQuickPrompt = sendQuickPrompt;
window.handleLaunchPool = handleLaunchPool;
window.handleCreatePool = handleCreatePool;
window.closeModal = closeModal;
window.openAuthModal = openAuthModal;
window.closeAuthModal = closeAuthModal;
window.toggleAuthMode = toggleAuthMode;
window.handleAuthSubmit = handleAuthSubmit;
window.handleLogout = handleLogout;
window.setLang = setLang;
window.openVoucherModal = openVoucherModal;
window.closeVoucherModal = closeVoucherModal;
window.copyVoucherCode = copyVoucherCode;
window.sharePool = sharePool;
window.closeShareMenu = closeShareMenu;
window.copyShareLink = copyShareLink;
window.downloadPickupReminder = downloadPickupReminder;
window.likeComment = likeComment;
window.openBulkModal = openBulkModal;
window.closeBulkModal = closeBulkModal;
window.handleBulkSubmit = handleBulkSubmit;
window.updateBulkSummary = updateBulkSummary;
window.toggleAiFab = toggleAiFab;
window.toggleLangDropdown = toggleLangDropdown;
window.toggleTownDropdown = toggleTownDropdown;
window.selectTownFromDropdown = selectTownFromDropdown;
window.toggleProduceDropdown = toggleProduceDropdown;
window.closeProduceDropdown = closeProduceDropdown;
window.setProduce = setProduce;
window.setCategoryGroup = setCategoryGroup;

init();
