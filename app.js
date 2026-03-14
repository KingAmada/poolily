        const runtimeConfig = window.POOLILY_RUNTIME_CONFIG || {};
        const mapboxToken = String(runtimeConfig.mapboxToken || '').trim();
        const MAPBOX_STYLE_URL = String(runtimeConfig.mapStyle || 'mapbox://styles/mapbox/standard').trim();
        const MAP_DEFAULT_ZOOM = Number(runtimeConfig.mapDefaultZoom || 14.5);
        const MAP_ROUTE_MAX_ZOOM = Number(runtimeConfig.mapRouteMaxZoom || 16.5);
        const FACE_MATCH_MAX_DISTANCE = Number(runtimeConfig.faceMatchMaxDistance || 0.42);
        const FACE_MIN_DETECTION_SCORE = Number(runtimeConfig.faceMinDetectionScore || 0.8);
        const TRACKING_ARRIVAL_RADIUS_METERS = Number(runtimeConfig.trackingArrivalRadiusMeters || 50);

        // Bank List Data
        const BANK_NAMES = [
            "Access Bank", "Citibank", "Ecobank", "Fidelity Bank", "First Bank", "FCMB", "GTBank",
            "Heritage Bank", "Keystone Bank", "Kuda Bank", "Moniepoint", "OPay", "PalmPay",
            "Polaris Bank", "Providus Bank", "Stanbic IBTC", "Standard Chartered", "Sterling Bank",
            "Taj Bank", "UBA", "Union Bank", "Unity Bank", "VFD MFB", "Wema Bank", "Zenith Bank"
        ];
        const ID_SAMPLE_LIBRARY = [
            { type: 'license', label: "Driver's License", src: "./idSamples/Driver's Licence.jpeg" },
            { type: 'nin', label: 'National ID Card', src: "./idSamples/National-ID.jpg" },
            { type: 'nin', label: 'NIMC Slip', src: './idSamples/Nimc Slip.png' },
            { type: 'passport', label: 'Passport Sample', src: './idSamples/Passport Sample.png' },
            { type: 'passport', label: 'Old Passport', src: './idSamples/Old Passport.jpeg' },
            { type: 'passport', label: 'Old Passport Complete', src: './idSamples/Old Passport complete.jpeg' }
        ];
        const ID_TEMPLATE_MATCH_MIN_SCORE = Number(runtimeConfig.idTemplateMatchMinScore || 0.72);
 
        function formatNaira(value) {
            return `₦${Math.max(0, Math.round(value)).toLocaleString()}`;
        }

        function getFareComparison(aeroFare) {
            const aero = Math.max(0, Number(aeroFare) || 0);
            if (!aero) return { regular: 0, aero: 0, savings: 0, savingsPct: 0 };

            // Enforce savings strictly >40% and <50%
            const minRegular = Math.floor((aero / 0.6) + 1);
            const maxRegular = Math.ceil((aero / 0.5) - 1);

            let regular = Math.round((aero * (1.68 + Math.random() * 0.27)) / 100) * 100;
            regular = Math.max(minRegular, Math.min(maxRegular, regular));
            regular = Math.round(regular / 100) * 100;
            regular = Math.max(minRegular, Math.min(maxRegular, regular));

            const savings = Math.max(0, regular - aero);
            const savingsPct = regular > 0 ? (savings / regular) * 100 : 0;
            return { regular, aero, savings, savingsPct };
        }

        const CAR_DATA_URL = 'https://raw.githubusercontent.com/demirelarda/CarMakesAndModels/master/carData.json';
        const FALLBACK_CAR_DATA = {
            "2026": { "Toyota": ["Corolla", "Camry", "RAV4", "Highlander"], "Honda": ["Civic", "Accord", "CR-V"], "Lexus": ["ES 350", "RX 350"] },
            "2025": { "Toyota": ["Corolla", "Camry", "RAV4", "Highlander"], "Honda": ["Civic", "Accord", "CR-V"], "Nissan": ["Altima", "Rogue", "X-Trail"] },
            "2024": { "Toyota": ["Corolla", "Camry", "Venza"], "Hyundai": ["Elantra", "Sonata", "Tucson"], "Kia": ["Sportage", "Sorento", "Rio"] },
            "2023": { "Toyota": ["Corolla", "Camry", "RAV4"], "Mercedes-Benz": ["C300", "E350", "GLC"], "BMW": ["320i", "X3", "X5"] },
            "2022": { "Toyota": ["Corolla", "Camry", "Yaris"], "Honda": ["Civic", "Accord"], "Ford": ["Escape", "Explorer", "Edge"] },
            "2021": { "Toyota": ["Corolla", "Camry"], "Lexus": ["ES 350", "RX 350"], "Nissan": ["Altima", "Sentra"] },
            "2020": { "Toyota": ["Corolla", "Camry"], "Hyundai": ["Elantra", "Sonata"], "Kia": ["Rio", "Cerato"] },
            "2019": { "Toyota": ["Corolla", "Camry"], "Honda": ["Accord", "Civic"], "Lexus": ["RX 350"] },
            "2018": { "Toyota": ["Corolla", "Camry"], "Nissan": ["Altima", "Sentra"], "Hyundai": ["Elantra"] },
            "2017": { "Toyota": ["Corolla", "Camry"], "Honda": ["Civic", "Accord"], "Ford": ["Escape", "Edge"] }
        };
        let driverCarCatalog = {};

        let socialProofMessages = [
            "Real drivers. Real passengers. No fake marketplace cards.",
            "Poolily starts live ride tracking from your actual GPS location.",
            "Verified airport rides powered by your Supabase data.",
            "Airport return trips, matched from real user records."
        ];

        function shuffleSocialProofMessages() {
            for (let i = socialProofMessages.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [socialProofMessages[i], socialProofMessages[j]] = [socialProofMessages[j], socialProofMessages[i]];
            }
        }

        let socialProofIndex = 0;
        let socialProofInterval = null;
        let socialProofHideTimeout = null;
        let deferredInstallPrompt = null;
        let isStandaloneInstalled = false;
        let brandTaglineInterval = null;
        let isApplyingPopState = false;
        let verifyAccountTimer = null;
        let verifyAccountToken = 0;
        let systemMessageAnchorTarget = null;
        const actionLocks = {};
        const MAX_IMAGE_SIDE = 1280;
        const IMAGE_COMPRESSION_QUALITY = 0.72;
        const STORAGE_KEYS = {
            backendUrl: 'poolily_backend_url',
            userSession: 'poolily_user_session'
        };
        const DEFAULT_BACKEND_ENDPOINT = 'https://objcsfzlelbdswfcaerb.supabase.co/functions/v1/poolily-gateway';
        const BACKEND_ENDPOINT = (window.POOLILY_BACKEND_URL || localStorage.getItem(STORAGE_KEYS.backendUrl) || DEFAULT_BACKEND_ENDPOINT).trim();

        // State
        const state = {
            user: null,
            activeTab: 'home',
            step: 'idle',
            role: null,
            authMode: 'signup',
            historyMode: 'rides',
            currentLocation: { lat: 9.0065, lng: 7.1986 }, // Default Abuja Nnamdi Azikiwe Airport
            watchId: null,
            rideDetails: { pickup: 'International Arrival', area: '', price: 0, seats: '1', departure: 'Leaving now', dropStyle: 'Hub drop', passengerPhoto: null },
            marketplaceDrivers: [],
            rideHistory: [],
            activeRideRequest: null,
            
            destMapInstance: null, destMarkers: [], destRouteSource: false,
            matchMapInstance: null, matchPassengerMarker: null, matchDriverMarker: null, approachInterval: null, driverDistance: null,
            trackMapInstance: null, trackMarkerInstance: null, trackRouteSource: false, trackMapLoaded: false,
            hasReachedDestination: false, tripStartedAt: null, cancellationReason: '',
            
            selectedDriver: null,
            sortBy: 'best'
        };

        const cancellationOptions = [
            "Changed my plans",
            "Wrong destination selected",
            "Driver/Passenger delayed",
            "Could not locate pickup/dropoff",
            "Safety concern",
            "Other"
        ];
 
        const abujaDestinations = [
            // First major ones
            { area: "Asokoro", desc: "First major ones", price: 9000, lat: 9.0383, lng: 7.5183 },
            { area: "Maitama", desc: "First major ones", price: 8500, lat: 9.0889, lng: 7.4933 },
            { area: "Wuse", desc: "First major ones", price: 7500, lat: 9.0765, lng: 7.4666 },
            { area: "Garki", desc: "First major ones", price: 7000, lat: 9.0305, lng: 7.4783 },
            { area: "Central Business District (CBD) / Central Area", desc: "First major ones", price: 7500, lat: 9.0544, lng: 7.4916 },
            { area: "Gwarinpa", desc: "First major ones", price: 9500, lat: 9.1066, lng: 7.4083 },
            { area: "Jabi", desc: "First major ones", price: 8000, lat: 9.0687, lng: 7.4244 },
            { area: "Utako", desc: "First major ones", price: 7500, lat: 9.0633, lng: 7.4333 },
            { area: "Wuye", desc: "First major ones", price: 7000, lat: 9.0533, lng: 7.4422 },
            { area: "Durumi", desc: "First major ones", price: 6500, lat: 9.0166, lng: 7.4666 },
            { area: "Guzape", desc: "First major ones", price: 8500, lat: 9.0233, lng: 7.5033 },
            { area: "Katampe", desc: "First major ones", price: 8500, lat: 9.1177, lng: 7.4666 },
            { area: "Kado", desc: "First major ones", price: 7500, lat: 9.0733, lng: 7.4166 },
            { area: "Life Camp", desc: "First major ones", price: 8000, lat: 9.0766, lng: 7.4033 },
            { area: "Apo", desc: "First major ones", price: 7500, lat: 8.9833, lng: 7.4833 },
            { area: "Dakibiyu", desc: "First major ones", price: 7000, lat: 9.0600, lng: 7.4200 },
            { area: "Galadimawa", desc: "First major ones", price: 6500, lat: 8.9833, lng: 7.4166 },
            { area: "Lokogoma", desc: "First major ones", price: 6500, lat: 8.9666, lng: 7.4333 },
            { area: "Kaura", desc: "First major ones", price: 7000, lat: 9.0000, lng: 7.4500 },
            { area: "Gaduwa", desc: "First major ones", price: 6500, lat: 8.9833, lng: 7.4666 },
            { area: "Games Village", desc: "First major ones", price: 7500, lat: 9.0166, lng: 7.4500 },
            { area: "Mbora", desc: "First major ones", price: 7000, lat: 9.0500, lng: 7.4000 },
            { area: "Jahi", desc: "First major ones", price: 8000, lat: 9.0877, lng: 7.4411 },
            { area: "Mabushi", desc: "First major ones", price: 7500, lat: 9.0833, lng: 7.4500 },
            { area: "Nyanya", desc: "First major ones", price: 5000, lat: 9.0500, lng: 7.5666 },
            { area: "Karu", desc: "First major ones", price: 5500, lat: 9.0166, lng: 7.5666 },
            { area: "Kurudu", desc: "First major ones", price: 5500, lat: 9.0000, lng: 7.6000 },
            { area: "Gwagwa", desc: "First major ones", price: 6000, lat: 9.1000, lng: 7.3333 },
            { area: "Orozo", desc: "First major ones", price: 6000, lat: 8.9666, lng: 7.6000 },
            { area: "Karshi", desc: "First major ones", price: 6500, lat: 8.8500, lng: 7.5500 },
            { area: "Idu", desc: "First major ones", price: 6500, lat: 9.0500, lng: 7.3500 },
            { area: "Sabon Lugbe", desc: "First major ones", price: 5500, lat: 8.9666, lng: 7.3666 },
            { area: "Karmo", desc: "First major ones", price: 6000, lat: 9.0666, lng: 7.3833 },
            { area: "Kagini", desc: "First major ones", price: 6500, lat: 9.1166, lng: 7.3500 },
            { area: "Lugbe", desc: "First major ones", price: 5500, lat: 8.9803, lng: 7.3733 },
            { area: "Kubwa", desc: "First major ones", price: 6000, lat: 9.1500, lng: 7.3166 },
            { area: "Dawaki", desc: "First major ones", price: 7000, lat: 9.1333, lng: 7.3833 },
            { area: "Mpape", desc: "First major ones", price: 6000, lat: 9.1333, lng: 7.4833 },
            { area: "Kuje", desc: "First major ones", price: 7000, lat: 8.8833, lng: 7.2333 },
            { area: "Pyakasa", desc: "First major ones", price: 6000, lat: 8.9833, lng: 7.4000 },
 
            // Full list without duplication
            { area: "Abacha Barracks", desc: "Other Area", price: 6000, lat: 9.0765, lng: 7.4666 },
            { area: "Airport", desc: "Other Area", price: 4000, lat: 9.0065, lng: 7.1986 },
            { area: "Ajata", desc: "Other Area", price: 6500, lat: 9.0765, lng: 7.4666 },
            { area: "Aleyita", desc: "Other Area", price: 6000, lat: 8.9833, lng: 7.3666 },
            { area: "Angawa Bawa", desc: "Other Area", price: 6500, lat: 9.0765, lng: 7.4666 },
            { area: "Angwan Sako", desc: "Other Area", price: 6500, lat: 9.0765, lng: 7.4666 },
            { area: "Anka", desc: "Other Area", price: 6000, lat: 9.0765, lng: 7.4666 },
            { area: "Apo-Dutse", desc: "Other Area", price: 7000, lat: 8.9833, lng: 7.4833 },
            { area: "Badna", desc: "Other Area", price: 6000, lat: 9.0765, lng: 7.4666 },
            { area: "Bagusa", desc: "Other Area", price: 6000, lat: 9.0765, lng: 7.4666 },
            { area: "Barowa", desc: "Other Area", price: 6000, lat: 9.0765, lng: 7.4666 },
            { area: "Bude", desc: "Other Area", price: 6000, lat: 9.0765, lng: 7.4666 },
            { area: "Bunkoro", desc: "Other Area", price: 6000, lat: 9.0765, lng: 7.4666 },
            { area: "Burum", desc: "Other Area", price: 6500, lat: 9.0765, lng: 7.4666 },
            { area: "Burun", desc: "Other Area", price: 6500, lat: 9.0765, lng: 7.4666 },
            { area: "Chafe", desc: "Other Area", price: 6000, lat: 9.0765, lng: 7.4666 },
            { area: "Chori Bisa", desc: "Other Area", price: 6000, lat: 9.0765, lng: 7.4666 },
            { area: "Dakwo", desc: "Other Area", price: 6500, lat: 9.0765, lng: 7.4666 },
            { area: "Damagaza", desc: "Other Area", price: 6500, lat: 9.0765, lng: 7.4666 },
            { area: "Damakuba", desc: "Other Area", price: 6000, lat: 9.0765, lng: 7.4666 },
            { area: "Dandi", desc: "Other Area", price: 6000, lat: 9.0765, lng: 7.4666 },
            { area: "Dantata", desc: "Other Area", price: 6000, lat: 9.0765, lng: 7.4666 },
            { area: "Dape", desc: "Other Area", price: 7000, lat: 9.0765, lng: 7.4666 },
            { area: "Dayisa", desc: "Other Area", price: 6000, lat: 9.0765, lng: 7.4666 },
            { area: "Dei-Dei", desc: "Other Area", price: 6500, lat: 9.1166, lng: 7.2833 },
            { area: "Dodo", desc: "Other Area", price: 6000, lat: 9.0765, lng: 7.4666 },
            { area: "Dogori Gada", desc: "Other Area", price: 6000, lat: 9.0765, lng: 7.4666 },
            { area: "Duboyi", desc: "Other Area", price: 6500, lat: 9.0765, lng: 7.4666 },
            { area: "Durumi I", desc: "Other Area", price: 6500, lat: 9.0166, lng: 7.4666 },
            { area: "Durumi II", desc: "Other Area", price: 6500, lat: 9.0166, lng: 7.4666 },
            { area: "Durumi III", desc: "Other Area", price: 6500, lat: 9.0166, lng: 7.4666 },
            { area: "Dutse", desc: "Other Area", price: 6500, lat: 9.1500, lng: 7.3666 },
            { area: "Filin Dabo", desc: "Other Area", price: 6000, lat: 9.0765, lng: 7.4666 },
            { area: "Filin Dabo I", desc: "Other Area", price: 6000, lat: 9.0765, lng: 7.4666 },
            { area: "Filin Dabo II", desc: "Other Area", price: 6000, lat: 9.0765, lng: 7.4666 },
            { area: "Garki II", desc: "Other Area", price: 7000, lat: 9.0305, lng: 7.4783 },
            { area: "Garki Village", desc: "Other Area", price: 6500, lat: 9.0305, lng: 7.4783 },
            { area: "Gbagarape", desc: "Other Area", price: 6000, lat: 9.0765, lng: 7.4666 },
            { area: "Gbenduniya", desc: "Other Area", price: 6000, lat: 9.0765, lng: 7.4666 },
            { area: "Gbessa", desc: "Other Area", price: 6000, lat: 9.0765, lng: 7.4666 },
            { area: "Gidan Ajiya", desc: "Other Area", price: 6000, lat: 9.0765, lng: 7.4666 },
            { area: "Gidan Mangoro", desc: "Other Area", price: 6500, lat: 9.0765, lng: 7.4666 },
            { area: "Gidari Bahagwo", desc: "Other Area", price: 6000, lat: 9.0765, lng: 7.4666 },
            { area: "Gora", desc: "Other Area", price: 6000, lat: 9.0765, lng: 7.4666 },
            { area: "Gosa", desc: "Other Area", price: 5500, lat: 8.9833, lng: 7.3333 },
            { area: "Gudu", desc: "Other Area", price: 7000, lat: 9.0166, lng: 7.4833 },
            { area: "Gud Pasali", desc: "Other Area", price: 6000, lat: 9.0765, lng: 7.4666 },
            { area: "Gugugu", desc: "Other Area", price: 6000, lat: 9.0765, lng: 7.4666 },
            { area: "Gui", desc: "Other Area", price: 6000, lat: 9.0765, lng: 7.4666 },
            { area: "Gwako", desc: "Other Area", price: 6000, lat: 8.9500, lng: 7.0833 },
            { area: "Gwagwalada Village", desc: "Other Area", price: 7000, lat: 8.9500, lng: 7.0833 },
            { area: "Gwari", desc: "Other Area", price: 6000, lat: 9.0765, lng: 7.4666 },
            { area: "Gwarinpa Federal Housing", desc: "Other Area", price: 8500, lat: 9.1066, lng: 7.4083 },
            { area: "Gwarinpa Life Camp", desc: "Other Area", price: 8500, lat: 9.1066, lng: 7.4083 },
            { area: "Gwarinpa Village", desc: "Other Area", price: 8000, lat: 9.1066, lng: 7.4083 },
            { area: "Iddo Maaji", desc: "Other Area", price: 6000, lat: 9.0765, lng: 7.4666 },
            { area: "Iddo Pada", desc: "Other Area", price: 6000, lat: 9.0765, lng: 7.4666 },
            { area: "Iddo Sabo", desc: "Other Area", price: 6000, lat: 9.0765, lng: 7.4666 },
            { area: "Iddo Sarki", desc: "Other Area", price: 6000, lat: 9.0765, lng: 7.4666 },
            { area: "Iddo Tudunwada", desc: "Other Area", price: 6000, lat: 9.0765, lng: 7.4666 },
            { area: "Idogwari", desc: "Other Area", price: 6000, lat: 9.0765, lng: 7.4666 },
            { area: "Industrial Area", desc: "Other Area", price: 7000, lat: 9.0765, lng: 7.4666 },
            { area: "Jaite", desc: "Other Area", price: 6000, lat: 9.0765, lng: 7.4666 },
            { area: "Jikoyi", desc: "Other Area", price: 5500, lat: 9.0765, lng: 7.4666 },
            { area: "Jikwoyi", desc: "Other Area", price: 5500, lat: 9.0333, lng: 7.6166 },
            { area: "Kaba", desc: "Other Area", price: 6000, lat: 9.0765, lng: 7.4666 },
            { area: "Kabusa", desc: "Other Area", price: 6000, lat: 8.9666, lng: 7.4500 },
            { area: "Kado Federal Housing", desc: "Other Area", price: 7500, lat: 9.0733, lng: 7.4166 },
            { area: "Kado Village", desc: "Other Area", price: 7000, lat: 9.0733, lng: 7.4166 },
            { area: "Kafe", desc: "Other Area", price: 6500, lat: 9.0765, lng: 7.4666 },
            { area: "Karu Site", desc: "Other Area", price: 5500, lat: 9.0166, lng: 7.5666 },
            { area: "Karu Site (FHA)", desc: "Other Area", price: 5500, lat: 9.0166, lng: 7.5666 },
            { area: "Karu Village (FHA)", desc: "Other Area", price: 5500, lat: 9.0166, lng: 7.5666 },
            { area: "Karsana", desc: "Other Area", price: 6500, lat: 9.0765, lng: 7.4666 },
            { area: "Karsana I", desc: "Other Area", price: 6500, lat: 9.0765, lng: 7.4666 },
            { area: "Karsana II", desc: "Other Area", price: 6500, lat: 9.0765, lng: 7.4666 },
            { area: "Karsana III", desc: "Other Area", price: 6500, lat: 9.0765, lng: 7.4666 },
            { area: "Ketti", desc: "Other Area", price: 6000, lat: 9.0765, lng: 7.4666 },
            { area: "Kobi", desc: "Other Area", price: 6000, lat: 9.0765, lng: 7.4666 },
            { area: "Koloke", desc: "Other Area", price: 6000, lat: 9.0765, lng: 7.4666 },
            { area: "Kpepegyi", desc: "Other Area", price: 6000, lat: 9.0765, lng: 7.4666 },
            { area: "Kpeyegyi", desc: "Other Area", price: 5500, lat: 9.0765, lng: 7.4666 },
            { area: "Kpoto", desc: "Other Area", price: 6000, lat: 9.0765, lng: 7.4666 },
            { area: "Kubwa Extension", desc: "Other Area", price: 6000, lat: 9.1500, lng: 7.3166 },
            { area: "Kugbo", desc: "Other Area", price: 5500, lat: 9.0333, lng: 7.5500 },
            { area: "Kukwaba", desc: "Other Area", price: 6500, lat: 9.0333, lng: 7.4333 },
            { area: "Kuchigoro", desc: "Other Area", price: 6000, lat: 9.0166, lng: 7.4333 },
            { area: "Kurudu Gwandara", desc: "Other Area", price: 5500, lat: 9.0000, lng: 7.6000 },
            { area: "Kurumduma", desc: "Other Area", price: 6000, lat: 9.0765, lng: 7.4666 },
            { area: "Kwoi", desc: "Other Area", price: 6000, lat: 9.0765, lng: 7.4666 },
            { area: "Kyami", desc: "Other Area", price: 6000, lat: 8.9500, lng: 7.2833 },
            { area: "Lekugoma", desc: "Other Area", price: 6000, lat: 9.0765, lng: 7.4666 },
            { area: "Madalla", desc: "Other Area", price: 5000, lat: 9.1000, lng: 7.2166 },
            { area: "Makana", desc: "Other Area", price: 6000, lat: 9.0765, lng: 7.4666 },
            { area: "Makanima", desc: "Other Area", price: 6000, lat: 9.0765, lng: 7.4666 },
            { area: "Mamusa", desc: "Other Area", price: 6000, lat: 9.0765, lng: 7.4666 },
            { area: "Munapeyi Kasa", desc: "Other Area", price: 6000, lat: 9.0765, lng: 7.4666 },
            { area: "Munapeyi Sama", desc: "Other Area", price: 6000, lat: 9.0765, lng: 7.4666 },
            { area: "Nbora", desc: "Other Area", price: 7000, lat: 9.0500, lng: 7.4000 },
            { area: "NEPA Village", desc: "Other Area", price: 6000, lat: 9.0765, lng: 7.4666 },
            { area: "Nuwalogye", desc: "Other Area", price: 6000, lat: 9.0765, lng: 7.4666 },
            { area: "Okanje", desc: "Other Area", price: 6000, lat: 9.0765, lng: 7.4666 },
            { area: "Orozo I", desc: "Other Area", price: 6000, lat: 8.9666, lng: 7.6000 },
            { area: "Orozo II", desc: "Other Area", price: 6000, lat: 8.9666, lng: 7.6000 },
            { area: "Parfun", desc: "Other Area", price: 6000, lat: 9.0765, lng: 7.4666 },
            { area: "Piwoyi", desc: "Other Area", price: 6000, lat: 8.9833, lng: 7.3833 },
            { area: "Sabon Gari", desc: "Other Area", price: 6000, lat: 9.0765, lng: 7.4666 },
            { area: "Sabo Gida", desc: "Other Area", price: 6000, lat: 9.0765, lng: 7.4666 },
            { area: "Saburi I", desc: "Other Area", price: 6000, lat: 9.0765, lng: 7.4666 },
            { area: "Saburi II", desc: "Other Area", price: 6000, lat: 9.0765, lng: 7.4666 },
            { area: "Saraji", desc: "Other Area", price: 6000, lat: 9.0765, lng: 7.4666 },
            { area: "Sauka", desc: "Other Area", price: 5500, lat: 8.9666, lng: 7.3000 },
            { area: "Sheretti", desc: "Other Area", price: 6000, lat: 9.0765, lng: 7.4666 },
            { area: "Takilogo", desc: "Other Area", price: 6000, lat: 9.0765, lng: 7.4666 },
            { area: "Takushara", desc: "Other Area", price: 6000, lat: 9.0765, lng: 7.4666 },
            { area: "Tasha", desc: "Other Area", price: 6000, lat: 9.0765, lng: 7.4666 },
            { area: "Toge", desc: "Other Area", price: 6000, lat: 9.0765, lng: 7.4666 },
            { area: "Tunga Kwaso", desc: "Other Area", price: 6000, lat: 9.0765, lng: 7.4666 },
            { area: "Tungan Jika", desc: "Other Area", price: 6000, lat: 9.0765, lng: 7.4666 },
            { area: "Tungan Wakili Isa", desc: "Other Area", price: 6000, lat: 9.0765, lng: 7.4666 },
            { area: "Wani", desc: "Other Area", price: 6000, lat: 9.0765, lng: 7.4666 },
            { area: "Waru-Pozema", desc: "Other Area", price: 6000, lat: 9.0765, lng: 7.4666 },
            { area: "Wowo", desc: "Other Area", price: 6000, lat: 9.0765, lng: 7.4666 },
            { area: "Wumba", desc: "Other Area", price: 6000, lat: 9.0765, lng: 7.4666 },
            { area: "Wupa", desc: "Other Area", price: 6000, lat: 9.0765, lng: 7.4666 },
            { area: "Wuse II", desc: "Other Area", price: 7500, lat: 9.0833, lng: 7.4666 },
            { area: "Zamani", desc: "Other Area", price: 6000, lat: 9.0765, lng: 7.4666 },
            { area: "Zaudna", desc: "Other Area", price: 6000, lat: 9.0765, lng: 7.4666 },
            { area: "Zhidu", desc: "Other Area", price: 6000, lat: 9.0765, lng: 7.4666 },
            { area: "Zidna", desc: "Other Area", price: 6000, lat: 9.0765, lng: 7.4666 },
            { area: "Zuba", desc: "Other Area", price: 5000, lat: 9.1166, lng: 7.2000 }
        ];
 
        const pickupCoords = {
            'International Arrival': { lat: 9.00679, lng: 7.26317 },
            'Local Departure': { lat: 9.007, lng: 7.264 },
            'Parking Lot': { lat: 9.005, lng: 7.262 },
            'Terminal A': { lat: 9.006, lng: 7.263 },
            'Terminal B': { lat: 9.0065, lng: 7.2635 },
            'Terminal C': { lat: 9.007, lng: 7.263 },
            'Terminal D': { lat: 9.0055, lng: 7.2625 },
            'On my way': { lat: 9.0065, lng: 7.263 }
        };
 
        // Boot
        window.onload = () => {
            lucide.createIcons();
            restoreUserSession();
            renderHistory();
            populateBanks();
            loadDriverCarCatalog();
            updateUI();
            initSocialProofTicker();
            initBrandTaglineRotator();
            applyPriceTagCharAnimation();
            isStandaloneInstalled = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
            updateInstallButtonVisibility();
            syncRouteState(true);

            if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
                navigator.serviceWorker.register('./sw.js').catch((err) => {
                    console.warn('Service worker registration failed:', err);
                });
            }
            
            // Close dropdown if clicked outside
            document.addEventListener('click', function(e) {
                const searchInput = document.getElementById('dest-search-input');
                const dropDown = document.getElementById('dest-dropdown');
                if(searchInput && dropDown && !searchInput.contains(e.target) && !dropDown.contains(e.target)) {
                    dropDown.classList.add('hidden');
                }
            });

            if (!isBackendConfigured()) {
                console.warn('Poolily backend URL is not configured. Run setPoolilyBackendUrl("YOUR_SUPABASE_FUNCTION_URL") in console.');
            } else if (state.user) {
                refreshWalletFromBackend({ silent: true });
                loadRideHistory({ silent: true }).then(() => renderHistory());
            }
        };

        window.addEventListener('beforeinstallprompt', (event) => {
            event.preventDefault();
            deferredInstallPrompt = event;
            updateInstallButtonVisibility();
        });

        window.addEventListener('appinstalled', () => {
            isStandaloneInstalled = true;
            deferredInstallPrompt = null;
            updateInstallButtonVisibility();
        });

        window.addEventListener('popstate', (event) => {
            const route = event.state;
            if (!route || route.poolilyRoute !== true) return;
            isApplyingPopState = true;
            try {
                setStep(String(route.step || 'idle'), String(route.tab || 'home'), false);
            } finally {
                isApplyingPopState = false;
            }
        });

        function initBrandTaglineRotator() {
            const el = document.getElementById('home-brand-tagline');
            if (!el) return;

            const taglines = [
                "Cheaper rides from the airport",
                "Earn as driver returning from airport"
            ];
            let idx = 0;
            el.innerText = taglines[idx];

            if (brandTaglineInterval) {
                clearInterval(brandTaglineInterval);
                brandTaglineInterval = null;
            }

            brandTaglineInterval = setInterval(() => {
                idx = (idx + 1) % taglines.length;
                el.style.transition = 'opacity 220ms ease, transform 220ms ease';
                el.style.opacity = '0';
                el.style.transform = 'translateY(4px)';
                setTimeout(() => {
                    el.innerText = taglines[idx];
                    el.style.opacity = '1';
                    el.style.transform = 'translateY(0)';
                }, 180);
            }, 4500);
        }

        function initSocialProofTicker() {
            const box = document.getElementById('home-social-proof-toast');
            const textEl = document.getElementById('home-social-proof-text');
            if (!box || !textEl) return;
            const cycleMs = 8000;
            const visibleMs = 5000;

            shuffleSocialProofMessages();
            socialProofIndex = 0;

            if (socialProofInterval) {
                clearInterval(socialProofInterval);
                socialProofInterval = null;
            }
            if (socialProofHideTimeout) {
                clearTimeout(socialProofHideTimeout);
                socialProofHideTimeout = null;
            }

            const showCurrent = () => {
                textEl.innerText = socialProofMessages[socialProofIndex];
                box.style.transition = 'none';
                box.style.opacity = '0';
                box.style.transform = 'translateX(28px)';
                requestAnimationFrame(() => {
                    box.style.transition = 'opacity 0.45s ease, transform 0.45s ease';
                    box.style.opacity = '1';
                    box.style.transform = 'translateX(0)';
                });
            };

            const hideCurrent = () => {
                box.style.opacity = '0';
                box.style.transform = 'translateX(28px)';
            };

            showCurrent();
            socialProofHideTimeout = setTimeout(hideCurrent, visibleMs);

            socialProofInterval = setInterval(() => {
                socialProofIndex = (socialProofIndex + 1) % socialProofMessages.length;
                showCurrent();
                if (socialProofHideTimeout) clearTimeout(socialProofHideTimeout);
                socialProofHideTimeout = setTimeout(hideCurrent, visibleMs);
            }, cycleMs);
        }

        function applyPriceTagCharAnimation() {
            const splitNodeChars = (node, startIndex) => {
                let index = startIndex;
                const frag = document.createDocumentFragment();

                node.childNodes.forEach((child) => {
                    if (child.nodeType === Node.TEXT_NODE) {
                        const chars = child.textContent.split('');
                        chars.forEach((ch) => {
                            const span = document.createElement('span');
                            span.className = 'fly-char';
                            span.style.setProperty('--char-delay', String(index * 36));
                            span.textContent = ch === ' ' ? '\u00A0' : ch;
                            frag.appendChild(span);
                            index += 1;
                        });
                    } else if (child.nodeType === Node.ELEMENT_NODE) {
                        const wrapper = document.createElement(child.tagName.toLowerCase());
                        wrapper.className = child.className;
                        const result = splitNodeChars(child, index);
                        wrapper.appendChild(result.frag);
                        frag.appendChild(wrapper);
                        index = result.index;
                    }
                });

                return { frag, index };
            };

            document.querySelectorAll('.flip-price-tag-text').forEach((el) => {
                if (el.dataset.charAnimated === '1') return;
                const result = splitNodeChars(el, 0);
                el.innerHTML = '';
                el.appendChild(result.frag);
                el.dataset.charAnimated = '1';
            });
        }

        function updateInstallButtonVisibility() {
            const installBtn = document.getElementById('btn-install-pwa');
            if (!installBtn) return;

            const canShowInstall = !isStandaloneInstalled && !!deferredInstallPrompt && state.step === 'idle' && state.activeTab === 'home';
            if (canShowInstall) {
                installBtn.classList.remove('hidden');
                installBtn.classList.add('flex');
            } else {
                installBtn.classList.add('hidden');
                installBtn.classList.remove('flex');
            }
        }

        async function handleInstallPWA() {
            if (isStandaloneInstalled) return;
            if (!deferredInstallPrompt) {
                showSystemMessage('Install is not available yet on this browser/session. Refresh and try again after using the app for a few seconds.', 'Install Unavailable', 'error');
                return;
            }
            deferredInstallPrompt.prompt();
            const result = await deferredInstallPrompt.userChoice;
            if (result && result.outcome !== 'accepted') {
                updateInstallButtonVisibility();
                return;
            }
            deferredInstallPrompt = null;
            updateInstallButtonVisibility();
        }

        function setPoolilyBackendUrl(url) {
            const normalized = String(url || '').trim();
            if (normalized) {
                localStorage.setItem(STORAGE_KEYS.backendUrl, normalized);
            } else {
                localStorage.removeItem(STORAGE_KEYS.backendUrl);
            }
            location.reload();
        }
        window.setPoolilyBackendUrl = setPoolilyBackendUrl;

        function isBackendConfigured() {
            return !!BACKEND_ENDPOINT;
        }

        function normalizePhone(phone) {
            let digits = String(phone || '').replace(/\D/g, '');
            if (!digits) return '';
            if (digits.startsWith('234') && digits.length >= 13) {
                digits = '0' + digits.slice(-10);
            } else if (digits.length === 10) {
                digits = '0' + digits;
            } else if (digits.length > 11) {
                digits = '0' + digits.slice(-10);
            }
            return digits;
        }

        function normalizeText(txt) {
            return String(txt || '').trim().toLowerCase();
        }

        function getRouteState() {
            return {
                poolilyRoute: true,
                step: state.step,
                tab: state.activeTab
            };
        }

        function syncRouteState(replace = false) {
            if (isApplyingPopState || !window.history || typeof window.history.pushState !== 'function') return;
            const next = getRouteState();
            const current = window.history.state;
            if (current && current.poolilyRoute === true && current.step === next.step && current.tab === next.tab) {
                if (replace) window.history.replaceState(next, '');
                return;
            }
            if (replace) window.history.replaceState(next, '');
            else window.history.pushState(next, '');
        }

        function readFileAsDataUrl(file) {
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = (ev) => resolve(ev.target.result);
                reader.onerror = () => reject(new Error('Failed to read image file'));
                reader.readAsDataURL(file);
            });
        }

        function resizeDataUrlImage(dataUrl, maxSide = MAX_IMAGE_SIDE, quality = IMAGE_COMPRESSION_QUALITY) {
            return new Promise((resolve, reject) => {
                const img = new Image();
                img.onload = () => {
                    let width = img.width;
                    let height = img.height;
                    const longest = Math.max(width, height);
                    if (longest > maxSide) {
                        const scale = maxSide / longest;
                        width = Math.max(1, Math.round(width * scale));
                        height = Math.max(1, Math.round(height * scale));
                    }

                    const canvas = document.createElement('canvas');
                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    if (!ctx) {
                        reject(new Error('Failed to create image canvas'));
                        return;
                    }
                    ctx.drawImage(img, 0, 0, width, height);
                    resolve(canvas.toDataURL('image/jpeg', quality));
                };
                img.onerror = () => reject(new Error('Failed to load image'));
                img.src = dataUrl;
            });
        }

        async function compressImageFile(file) {
            const rawDataUrl = await readFileAsDataUrl(file);
            return resizeDataUrlImage(rawDataUrl);
        }

        function setAuthServerMessage(type, msg) {
            const box = document.getElementById('auth-server-message');
            if (!box) return;
            if (!msg) {
                box.className = 'hidden mt-4 rounded-2xl border px-4 py-3 text-sm font-bold';
                box.innerText = '';
                return;
            }

            if (type === 'success') {
                box.className = 'mt-4 rounded-2xl border border-green-200 bg-green-50 text-green-700 px-4 py-3 text-sm font-bold animate-pop-in';
            } else {
                box.className = 'mt-4 rounded-2xl border border-red-200 bg-red-50 text-red-700 px-4 py-3 text-sm font-bold animate-pop-in';
            }
            box.innerText = msg;
        }

        function setAuthSubmitLoading(isLoading) {
            const btn = document.getElementById('btn-auth-submit');
            if (!btn) return;
            if (isLoading) {
                if (!btn.dataset.defaultText) btn.dataset.defaultText = btn.innerText;
                btn.disabled = true;
                btn.classList.add('opacity-70', 'cursor-not-allowed');
                btn.innerHTML = '<span class="inline-flex items-center gap-2"><i data-lucide="loader-2" class="animate-spin" width="16"></i> Processing...</span>';
                lucide.createIcons();
                return;
            }
            btn.disabled = false;
            btn.classList.remove('opacity-70', 'cursor-not-allowed');
            btn.innerText = btn.dataset.defaultText || (state.authMode === 'signup' ? 'Create Profile' : 'Log In');
        }

        function setButtonProcessing(btn, isProcessing, loadingText = 'Processing...') {
            if (!btn) return;
            if (isProcessing) {
                if (!btn.dataset.defaultText) btn.dataset.defaultText = btn.innerText.trim();
                btn.disabled = true;
                btn.classList.add('opacity-70', 'cursor-not-allowed');
                btn.innerHTML = `<span class="inline-flex items-center gap-2"><i data-lucide="loader-2" class="animate-spin" width="16"></i> ${loadingText}</span>`;
                lucide.createIcons();
            } else {
                btn.disabled = false;
                btn.classList.remove('opacity-70', 'cursor-not-allowed');
                btn.innerText = btn.dataset.defaultText || btn.innerText;
            }
        }

        function beginActionLock(key, btn, loadingText = 'Processing...') {
            if (actionLocks[key]) return false;
            actionLocks[key] = true;
            setButtonProcessing(btn, true, loadingText);
            return true;
        }

        function endActionLock(key, btn) {
            actionLocks[key] = false;
            setButtonProcessing(btn, false);
        }

        async function backendRequest(action, payload = {}) {
            if (!isBackendConfigured()) {
                throw new Error('Backend is not configured. Set your Supabase function URL with setPoolilyBackendUrl("...").');
            }

            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 18000);
            try {
                const body = new URLSearchParams();
                body.set('action', action);
                body.set('payload', JSON.stringify(payload));

                const res = await fetch(BACKEND_ENDPOINT, {
                    method: 'POST',
                    body,
                    signal: controller.signal
                });
                const raw = await res.text();
                let data = null;
                try {
                    data = JSON.parse(raw);
                } catch (_) {
                    const err = new Error('Backend returned a non-JSON response. Check Apps Script deployment access and URL.');
                    err.code = 'INVALID_BACKEND_RESPONSE';
                    throw err;
                }
                if (!res.ok || !data || data.success === false) {
                    const err = new Error((data && data.message) || 'Request failed');
                    err.code = data && data.code ? data.code : 'REQUEST_FAILED';
                    throw err;
                }
                return data;
            } finally {
                clearTimeout(timeout);
            }
        }

        async function refreshWalletFromBackend(options = {}) {
            const silent = options.silent !== false;
            if (!state.user || !isBackendConfigured()) return false;

            try {
                const response = await backendRequest('getWalletStatus', {
                    userId: state.user.id,
                    phone: state.user.phone,
                    role: state.role
                });
                if (!response || !response.user) return false;

                hydrateUserFromBackend({
                    ...state.user,
                    ...response.user
                }, state.role);
                renderProfile();
                return true;
            } catch (err) {
                if (!silent) {
                    showSystemMessage(err.message || 'Could not refresh wallet status.', 'Wallet Sync Failed', 'error');
                }
                return false;
            }
        }

        async function loadMarketplaceDrivers(options = {}) {
            const silent = options.silent !== false;
            if (!isBackendConfigured()) return [];
            try {
                const response = await backendRequest('listMarketplaceDrivers', {
                    userId: state.user ? state.user.id : '',
                    limit: 12
                });
                state.marketplaceDrivers = Array.isArray(response.drivers) ? response.drivers : [];
                return state.marketplaceDrivers;
            } catch (err) {
                if (!silent) {
                    showSystemMessage(err.message || 'Could not load drivers from database.', 'Driver Load Failed', 'error');
                }
                state.marketplaceDrivers = [];
                return [];
            }
        }

        async function loadRideHistory(options = {}) {
            const silent = options.silent !== false;
            if (!state.user || !isBackendConfigured()) {
                state.rideHistory = [];
                return [];
            }
            try {
                const response = await backendRequest('getRideHistory', {
                    userId: state.user.id,
                    phone: state.user.phone,
                    limit: 20
                });
                state.rideHistory = Array.isArray(response.rides) ? response.rides : [];
                return state.rideHistory;
            } catch (err) {
                if (!silent) {
                    showSystemMessage(err.message || 'Could not load ride history.', 'History Load Failed', 'error');
                }
                state.rideHistory = [];
                return [];
            }
        }

        async function loadOpenRideRequests(options = {}) {
            const silent = options.silent !== false;
            if (!isBackendConfigured()) return [];
            try {
                const response = await backendRequest('listOpenRideRequests', {
                    userId: state.user ? state.user.id : '',
                    limit: 5
                });
                const requests = Array.isArray(response.requests) ? response.requests : [];
                state.activeRideRequest = requests[0] || null;
                return requests;
            } catch (err) {
                if (!silent) {
                    showSystemMessage(err.message || 'Could not load open ride requests.', 'Request Load Failed', 'error');
                }
                state.activeRideRequest = null;
                return [];
            }
        }

        function getInitials(name) {
            return String(name || '')
                .trim()
                .split(/\s+/)
                .slice(0, 2)
                .map((part) => part.charAt(0).toUpperCase())
                .join('') || 'U';
        }

        function buildAvatarMarkup(entity, sizeClass = 'w-12 h-12', textClass = 'text-lg') {
            const name = entity && entity.name ? entity.name : 'User';
            const photo = entity && (entity.profilePhoto || entity.profile_photo_url);
            if (photo) {
                return `<div class="${sizeClass} rounded-full bg-slate-200 border border-white shadow-sm overflow-hidden shrink-0"><img src="${photo}" alt="${name}" class="w-full h-full object-cover"/></div>`;
            }
            return `<div class="${sizeClass} rounded-full bg-blue-100 text-blue-600 border border-white shadow-sm flex items-center justify-center font-black ${textClass} shrink-0">${getInitials(name)}</div>`;
        }

        function formatRideHistoryDate(value) {
            if (!value) return 'Recent trip';
            const date = new Date(value);
            if (!Number.isFinite(date.getTime())) return 'Recent trip';
            return date.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
        }

        function deriveDriverMarketplaceData(driver, index) {
            const baseFare = Math.max(0, Number(state.rideDetails.price || 0));
            const fareOffset = (index % 3) * 400;
            const quotedFare = Math.max(2500, baseFare + fareOffset);
            const name = driver.name || 'Driver';
            return {
                ...driver,
                avatar: buildAvatarMarkup(driver),
                car: [driver.carYear, driver.carMake, driver.carModel].filter(Boolean).join(' ').trim() || 'Driver vehicle',
                plate: driver.plateNumber || 'Plate pending',
                rating: Number(driver.rating || 5),
                price: quotedFare,
                eta: `${4 + (index * 2)} min`,
                seats: `${Math.max(1, 4 - (index % 3))} seat${Math.max(1, 4 - (index % 3)) > 1 ? 's' : ''}`,
                drop: state.rideDetails.dropStyle || 'Hub drop',
                badges: Array.isArray(driver.badges) ? driver.badges : ['ID verified', 'Phone verified'],
                departure: index === 0 ? 'Leaving now' : `Leaving in ${4 + (index * 3)} mins`,
                departureMins: index === 0 ? 0 : (4 + (index * 3)),
                match: Math.max(80, 96 - (index * 4)),
                phone: driver.phone || '',
                profilePhoto: driver.profilePhoto || null,
                nameInitials: getInitials(name)
            };
        }

        function normalizeWalletAccountNumber(value) {
            if (typeof value === 'string') return value;
            if (typeof value === 'number' && Number.isFinite(value)) return String(value);
            if (value && typeof value === 'object') {
                if (typeof value.accountNumber === 'string' || typeof value.accountNumber === 'number') {
                    return String(value.accountNumber);
                }
                if (typeof value.value === 'string' || typeof value.value === 'number') {
                    return String(value.value);
                }
            }
            return "";
        }

        function formatWalletAccountNumber(value) {
            const digits = normalizeWalletAccountNumber(value).replace(/\D/g, '');
            if (!digits) return 'Not available';
            return digits.replace(/(\d{4})(\d{4})(\d{2,})/, '$1 $2 $3');
        }

        function normalizeUserState(rawUser, fallbackRole) {
            const raw = rawUser || {};
            const role = raw.role || fallbackRole || state.role || 'passenger';
            const balance = Number(raw.walletBalance ?? raw.wallet?.balance ?? 0);
            const walletHistory = Array.isArray(raw.walletHistory)
                ? raw.walletHistory
                : (Array.isArray(raw.wallet?.history) ? raw.wallet.history : []);
            const walletAccountNumber = normalizeWalletAccountNumber(
                raw.walletAccountNumber ?? raw.wallet?.accountNumber
            ) || ("5770" + Math.floor(100000 + Math.random() * 900000));

            return {
                id: raw.userId || raw.id || `usr-${Date.now()}`,
                name: raw.name || 'Poolily User',
                phone: raw.phone || '',
                role,
                plateNumber: raw.plateNumber || null,
                carYear: raw.carYear || null,
                carMake: raw.carMake || null,
                carModel: raw.carModel || null,
                carType: raw.carType || null,
                profilePhoto: raw.profilePhoto || null,
                wallet: {
                    balance: Number.isFinite(balance) ? balance : 0,
                    accountNumber: walletAccountNumber,
                    bank: raw.walletBank || raw.wallet?.bank || "Stanbic IBTC",
                    history: walletHistory
                },
                bankDetails: raw.bankDetails || { bankCode: "", bankName: "", accountNumber: "", accountName: "" }
            };
        }

        function hydrateUserFromBackend(raw, fallbackRole) {
            const role = raw.role || fallbackRole || state.role || 'passenger';
            state.user = normalizeUserState(raw, role);
            state.role = role;
            persistUserSession();
        }

        function persistUserSession() {
            if (!state.user) {
                localStorage.removeItem(STORAGE_KEYS.userSession);
                return;
            }
            if (!state.user.id) {
                state.user.id = `usr-local-${Date.now()}`;
            }
            localStorage.setItem(STORAGE_KEYS.userSession, JSON.stringify({
                user: state.user,
                role: state.role
            }));
        }

        function restoreUserSession() {
            try {
                const raw = localStorage.getItem(STORAGE_KEYS.userSession);
                if (!raw) return;
                const parsed = JSON.parse(raw);
                if (!parsed || !parsed.user) return;
                state.role = parsed.role || parsed.user.role || null;
                state.user = normalizeUserState(parsed.user, state.role);
            } catch (_) {}
        }

        async function syncRecord(entity, data, mode = 'append', idField = '', idValue = '', required = false) {
            if (!isBackendConfigured()) {
                if (required) throw new Error('Backend is not configured.');
                return false;
            }
            const maxAttempts = required ? 2 : 1;
            let lastErr = null;
            for (let i = 0; i < maxAttempts; i++) {
                try {
                    await backendRequest('syncRecord', { entity, data, mode, idField, idValue });
                    return true;
                } catch (err) {
                    lastErr = err;
                    console.warn('Sync error:', err.message || err);
                }
            }
            if (required && lastErr) throw lastErr;
            return false;
        }

        function getAuthPayload() {
            const phone = normalizePhone(document.getElementById('auth-phone').value);
            const name = document.getElementById('auth-name').value.trim();
            const plateNum = document.getElementById('auth-plateNumber').value.trim();
            const idType = document.getElementById('auth-idType').value;
            const idNumber = document.getElementById('auth-idNumber').value.trim();
            const randomAcc = Math.floor(100000 + Math.random() * 900000).toString();
            const bankName = document.getElementById('auth-driver-bank') ? document.getElementById('auth-driver-bank').value : "";
            const bankAccNum = document.getElementById('auth-driver-acc-num') ? document.getElementById('auth-driver-acc-num').value : "";
            const bankAccName = document.getElementById('auth-driver-acc-name') ? document.getElementById('auth-driver-acc-name').value : "";
            const carYear = document.getElementById('auth-car-year') ? document.getElementById('auth-car-year').value : "";
            const carMake = document.getElementById('auth-car-make') ? document.getElementById('auth-car-make').value : "";
            const carModel = document.getElementById('auth-car-model') ? document.getElementById('auth-car-model').value : "";
            const carType = document.getElementById('auth-car-type') ? document.getElementById('auth-car-type').value : "";

            return {
                name,
                phone,
                phoneNormalized: phone,
                role: state.role,
                plateNumber: state.role === 'driver' ? plateNum : null,
                carYear: state.role === 'driver' ? carYear : null,
                carMake: state.role === 'driver' ? carMake : null,
                carModel: state.role === 'driver' ? carModel : null,
                carType: state.role === 'driver' ? carType : null,
                profilePhoto: authSelfieData || '',
                idPhoto: authIdData || '',
                idType,
                idNumber,
                walletBalance: 0,
                walletAccountNumber: "5770" + randomAcc,
                walletBank: "Stanbic IBTC",
                walletHistory: [],
                bankDetails: { bankCode: bankName, bankName, accountNumber: bankAccNum, accountName: bankAccName },
                source: 'webapp',
                createdAtClient: new Date().toISOString()
            };
        }
 
        // UI Core
        function updateUI() {
            document.querySelectorAll('.app-screen').forEach(el => el.classList.add('hidden-screen'));
            
            const bottomNav = document.getElementById('bottom-nav');
            const hideBottomNavSteps = ['auth', 'searching', 'matched', 'tracking'];
            if (state.user && !hideBottomNavSteps.includes(state.step)) {
                bottomNav.classList.remove('hidden');
                updateNavStyles();
            } else {
                bottomNav.classList.add('hidden');
            }
 
            // Role Locking Logic on Home Screen
            const driverBtn = document.getElementById('btn-role-driver');
            const passengerBtn = document.getElementById('btn-role-passenger');
            if (driverBtn && passengerBtn) {
                if (state.user) {
                    if (state.role === 'driver') {
                        driverBtn.classList.remove('hidden'); driverBtn.classList.add('flex');
                        passengerBtn.classList.add('hidden'); passengerBtn.classList.remove('flex');
                    } else if (state.role === 'passenger') {
                        passengerBtn.classList.remove('hidden'); passengerBtn.classList.add('flex');
                        driverBtn.classList.add('hidden'); driverBtn.classList.remove('flex');
                    }
                } else {
                    driverBtn.classList.remove('hidden'); driverBtn.classList.add('flex');
                    passengerBtn.classList.remove('hidden'); passengerBtn.classList.add('flex');
                }
            }
 
            if (state.step === 'idle') {
                document.getElementById(`screen-${state.activeTab}`).classList.remove('hidden-screen');
                if (state.activeTab === 'home' && state.user) {
                    document.getElementById('home-user-badge').classList.remove('hidden');
                    document.getElementById('home-user-badge').classList.add('flex');
                    document.getElementById('home-user-name').innerText = `Hi, ${state.user.name.split(' ')[0]}`;
                    document.getElementById('home-user-initial').innerText = state.user.name.charAt(0).toUpperCase();
                } else {
                    document.getElementById('home-user-badge').classList.add('hidden');
                    document.getElementById('home-user-badge').classList.remove('flex');
                }
 
                if (state.activeTab === 'profile') {
                    renderProfile();
                }
                if (state.activeTab === 'history') {
                    renderHistory();
                }
            } else {
                document.getElementById(`screen-${state.step}`).classList.remove('hidden-screen');
            }
            
            const shareBtn = document.getElementById('btn-share-ride');
            if(shareBtn) {
                if(state.step === 'tracking' && (state.role === 'passenger' || state.role === 'driver')) {
                    shareBtn.classList.remove('hidden'); shareBtn.classList.add('flex');
                } else {
                    shareBtn.classList.add('hidden'); shareBtn.classList.remove('flex');
                }
            }

            updateInstallButtonVisibility();
        }
 
        function updateNavStyles() {
            ['home', 'history', 'profile'].forEach(tab => {
                const btn = document.getElementById(`nav-${tab}`);
                if (state.activeTab === tab) {
                    btn.className = "flex-1 flex flex-col items-center justify-center py-2 rounded-[1.2rem] transition-all duration-300 bg-white shadow-[0_4px_10px_rgba(0,0,0,0.05)] text-blue-600 scale-100";
                } else {
                    btn.className = "flex-1 flex flex-col items-center justify-center py-2 rounded-[1.2rem] transition-all duration-300 text-slate-400 hover:text-slate-600 scale-95";
                }
            });
        }
 
        function setTab(tab, syncHistory = true) {
            // Allow bottom nav to return user to the main tab shell from flow screens.
            if (state.user && state.step !== 'idle') {
                setStep('idle', tab, syncHistory);
                return;
            }
            state.activeTab = tab;
            updateUI();
            if (syncHistory) syncRouteState();
        }
 
        function setStep(newStep, newTab = null, syncHistory = true) {
            state.step = newStep;
            if (newTab) state.activeTab = newTab;

            if (state.user) {
                syncRecord('StepEvents', {
                    userId: state.user.id,
                    role: state.role,
                    step: state.step,
                    activeTab: state.activeTab
                });
            }
            
            if (state.step !== 'tracking' && state.step !== 'destination' && state.step !== 'matched' && state.watchId) {
                navigator.geolocation.clearWatch(state.watchId);
                state.watchId = null;
            }
            if (state.step !== 'matched' && state.approachInterval) {
                clearInterval(state.approachInterval);
                state.approachInterval = null;
            }
 
            updateUI();
            if (syncHistory) syncRouteState();
            
            setTimeout(() => {
                if (state.destMapInstance && state.step === 'destination') state.destMapInstance.resize();
                if (state.matchMapInstance && state.step === 'matched') state.matchMapInstance.resize();
                if (state.trackMapInstance && state.step === 'tracking') state.trackMapInstance.resize();
            }, 100);
        }
 
        function handleRoleSelect(role) {
            state.role = role;
            if (state.user && state.user.role && state.user.role !== role) {
                state.user = null;
                persistUserSession();
            }
            if (!state.user) {
                setAuthMode('signup');
                setStep('auth');
            } else {
                setupDestinationScreen();
                setStep('destination');
            }
        }
 
        let authSelfieData = null;
        let authIdData = null;
        let authIdTemplateMatch = null;
        let idSampleSignaturesPromise = null;
 
        // Auth Logic
        function setAuthMode(mode) {
            state.authMode = mode;
            setAuthServerMessage('', '');
            setAuthSubmitLoading(false);
            const btnSignup = document.getElementById('tab-signup');
            const btnLogin = document.getElementById('tab-login');
            
            if (mode === 'signup') {
                btnSignup.className = "flex-1 py-3 rounded-2xl font-black text-sm transition-all duration-300 bg-white shadow-[0_4px_10px_rgba(0,0,0,0.05)] text-blue-600 scale-100";
                btnLogin.className = "flex-1 py-3 rounded-2xl font-black text-sm transition-all duration-300 text-slate-500 hover:text-slate-700 scale-95";
                document.getElementById('signup-fields').classList.remove('hidden');
                document.getElementById('auth-heading').innerText = "Create Profile";
                document.getElementById('btn-auth-submit').innerText = "Create Profile";
                document.getElementById('btn-auth-submit').dataset.defaultText = "Create Profile";
                
                if(state.role === 'driver') {
                    document.getElementById('plateNumber-container').classList.remove('hidden');
                    document.getElementById('driver-car-details-container').classList.remove('hidden');
                    document.getElementById('auth-driver-payout-container').classList.remove('hidden');
                    document.getElementById('auth-driver-payout-container').classList.add('flex');
                } else {
                    document.getElementById('plateNumber-container').classList.add('hidden');
                    document.getElementById('driver-car-details-container').classList.add('hidden');
                    document.getElementById('auth-driver-payout-container').classList.add('hidden');
                    document.getElementById('auth-driver-payout-container').classList.remove('flex');
                }
                document.getElementById('auth-selfie-container').classList.remove('hidden');
                document.getElementById('auth-selfie-container').classList.add('flex');
            } else {
                btnLogin.className = "flex-1 py-3 rounded-2xl font-black text-sm transition-all duration-300 bg-white shadow-[0_4px_10px_rgba(0,0,0,0.05)] text-blue-600 scale-100";
                btnSignup.className = "flex-1 py-3 rounded-2xl font-black text-sm transition-all duration-300 text-slate-500 hover:text-slate-700 scale-95";
                document.getElementById('signup-fields').classList.add('hidden');
                document.getElementById('auth-heading').innerText = "Welcome Back";
                document.getElementById('btn-auth-submit').innerText = "Log In";
                document.getElementById('btn-auth-submit').dataset.defaultText = "Log In";
            }
        }
 
        async function handleAuthSelfieUpload(e) {
            const file = e.target.files && e.target.files[0];
            if (!file) return;
            try {
                authSelfieData = await compressImageFile(file);
            } catch (err) {
                console.warn('Selfie compression failed, using original image:', err);
                authSelfieData = await readFileAsDataUrl(file);
            }
            document.getElementById('auth-selfie-preview').innerHTML = `<img src="${authSelfieData}" class="w-full h-full object-cover rounded-full" />`;
            const err = document.getElementById('auth-selfie-error');
            if(err) { err.classList.add('hidden'); err.classList.remove('flex'); }
        }
 
        async function handleAuthIdUpload(e) {
            const status = document.getElementById('auth-id-status');
            if(e.target.files.length > 0) {
                const file = e.target.files[0];
                try {
                    authIdData = await compressImageFile(file);
                } catch (err) {
                    console.warn('ID compression failed, using original image:', err);
                    authIdData = await readFileAsDataUrl(file);
                }
                status.innerText = 'Checking document format...';
                status.className = 'text-blue-600 text-sm font-black mt-2 text-center bg-white/50 py-1 rounded-full mx-8 border border-white';
                authIdTemplateMatch = null;
                try {
                    const result = await inferIdDocumentType(authIdData);
                    authIdTemplateMatch = result;
                    const typeSelect = document.getElementById('auth-idType');
                    if (typeSelect && result && result.confident && result.type) {
                        typeSelect.value = result.type;
                        handleIdTypeChange();
                    }
                    if (result && result.confident) {
                        status.innerText = `Detected ${result.label} template (${Math.round(result.score * 100)}%)`;
                        status.className = 'text-green-600 text-sm font-black mt-2 text-center bg-white/50 py-1 rounded-full mx-8 border border-white';
                    } else if (result && result.label) {
                        status.innerText = 'Kindly take a clearer picture, or upload the right ID document.';
                        status.className = 'text-red-500 text-sm font-black mt-2 text-center bg-white/50 py-1 rounded-full mx-8 border border-red-200';
                    } else {
                        status.innerText = 'Kindly take a clearer picture, or upload the right ID document.';
                        status.className = 'text-red-500 text-sm font-black mt-2 text-center bg-white/50 py-1 rounded-full mx-8 border border-red-200';
                    }
                } catch (err) {
                    console.warn('ID template matching failed:', err);
                    authIdTemplateMatch = { confident: false, score: 0, type: '', label: '' };
                    status.innerText = 'Kindly take a clearer picture, or upload the right ID document.';
                    status.className = 'text-red-500 text-sm font-black mt-2 text-center bg-white/50 py-1 rounded-full mx-8 border border-red-200';
                }
            }
        }

        function loadImageElement(src) {
            return new Promise((resolve, reject) => {
                const img = new Image();
                img.crossOrigin = 'anonymous';
                img.onload = () => resolve(img);
                img.onerror = () => reject(new Error(`Could not load image: ${src}`));
                img.src = encodeURI(src);
            });
        }

        function buildImageSignature(img) {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            const size = 32;
            canvas.width = size;
            canvas.height = size;
            if (!ctx) throw new Error('Canvas context unavailable');

            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, size, size);

            const scale = Math.min(size / img.width, size / img.height);
            const drawWidth = Math.max(1, Math.round(img.width * scale));
            const drawHeight = Math.max(1, Math.round(img.height * scale));
            const offsetX = Math.round((size - drawWidth) / 2);
            const offsetY = Math.round((size - drawHeight) / 2);
            ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight);

            const { data } = ctx.getImageData(0, 0, size, size);
            const grayscale = [];
            let total = 0;
            let edgeTotal = 0;
            for (let y = 0; y < size; y += 1) {
                for (let x = 0; x < size; x += 1) {
                    const idx = (y * size + x) * 4;
                    const gray = (data[idx] * 0.299) + (data[idx + 1] * 0.587) + (data[idx + 2] * 0.114);
                    grayscale.push(gray);
                    total += gray;
                    if (x > 0) edgeTotal += Math.abs(gray - grayscale[grayscale.length - 2]);
                    if (y > 0) edgeTotal += Math.abs(gray - grayscale[(y - 1) * size + x]);
                }
            }
            const mean = total / grayscale.length;
            const hash = grayscale.map((v) => (v > mean ? '1' : '0')).join('');
            return {
                hash,
                mean,
                edgeDensity: edgeTotal / grayscale.length,
                aspectRatio: img.width / img.height,
            };
        }

        function hammingSimilarity(a, b) {
            if (!a || !b || a.length !== b.length) return 0;
            let matches = 0;
            for (let i = 0; i < a.length; i += 1) {
                if (a[i] === b[i]) matches += 1;
            }
            return matches / a.length;
        }

        function compareImageSignatures(uploadSig, sampleSig) {
            const hashScore = hammingSimilarity(uploadSig.hash, sampleSig.hash);
            const aspectPenalty = Math.min(1, Math.abs(uploadSig.aspectRatio - sampleSig.aspectRatio) / 1.4);
            const edgePenalty = Math.min(1, Math.abs(uploadSig.edgeDensity - sampleSig.edgeDensity) / 40);
            const brightnessPenalty = Math.min(1, Math.abs(uploadSig.mean - sampleSig.mean) / 80);
            return (hashScore * 0.7) + ((1 - aspectPenalty) * 0.15) + ((1 - edgePenalty) * 0.1) + ((1 - brightnessPenalty) * 0.05);
        }

        async function loadIdSampleSignatures() {
            if (!idSampleSignaturesPromise) {
                idSampleSignaturesPromise = Promise.all(ID_SAMPLE_LIBRARY.map(async (sample) => {
                    const img = await loadImageElement(sample.src);
                    return { ...sample, signature: buildImageSignature(img) };
                }));
            }
            return idSampleSignaturesPromise;
        }

        async function inferIdDocumentType(dataUrl) {
            const [uploadImg, samples] = await Promise.all([
                loadImageElement(dataUrl),
                loadIdSampleSignatures()
            ]);
            const uploadSignature = buildImageSignature(uploadImg);
            const scored = samples.map((sample) => ({
                ...sample,
                score: compareImageSignatures(uploadSignature, sample.signature)
            })).sort((a, b) => b.score - a.score);

            const best = scored[0];
            const runnerUp = scored[1];
            const scoreGap = best && runnerUp ? (best.score - runnerUp.score) : (best?.score || 0);
            return {
                type: best?.type || '',
                label: best?.label || '',
                score: best?.score || 0,
                scoreGap: scoreGap || 0,
                confident: !!best && best.score >= ID_TEMPLATE_MATCH_MIN_SCORE && scoreGap >= 0.035,
            };
        }
 
        async function detectFacesRobust(imgEl, { forId = false, includeExpressions = false } = {}) {
            const runDetectionsOn = async (targetImg) => {
                const detectWithOptions = (options) => {
                    let chain = faceapi.detectAllFaces(targetImg, options).withFaceLandmarks().withFaceDescriptors();
                    if (includeExpressions) chain = chain.withFaceExpressions();
                    return chain;
                };
                const detectDefault = () => {
                    let chain = faceapi.detectAllFaces(targetImg).withFaceLandmarks().withFaceDescriptors();
                    if (includeExpressions) chain = chain.withFaceExpressions();
                    return chain;
                };
                const attempts = [
                    () => detectWithOptions(new faceapi.TinyFaceDetectorOptions({ inputSize: 512, scoreThreshold: 0.18 })),
                    () => detectWithOptions(new faceapi.TinyFaceDetectorOptions({ inputSize: 640, scoreThreshold: 0.12 })),
                    () => detectWithOptions(new faceapi.TinyFaceDetectorOptions({ inputSize: 416, scoreThreshold: 0.1 })),
                    () => detectDefault(),
                ];

                for (const run of attempts) {
                    const faces = await run();
                    if (faces && faces.length) {
                        return faces.sort((a, b) => {
                            const aBox = a.detection?.box || { width: 0, height: 0 };
                            const bBox = b.detection?.box || { width: 0, height: 0 };
                            return (bBox.width * bBox.height) - (aBox.width * aBox.height);
                        });
                    }
                }
                return [];
            };

            const directFaces = await runDetectionsOn(imgEl);
            if (directFaces.length) return directFaces;

            if (forId) {
                const cropCanvas = document.createElement('canvas');
                const cropCtx = cropCanvas.getContext('2d');
                if (cropCtx) {
                    const srcWidth = imgEl.naturalWidth || imgEl.width;
                    const srcHeight = imgEl.naturalHeight || imgEl.height;
                    cropCanvas.width = srcWidth;
                    cropCanvas.height = srcHeight;
                    cropCtx.drawImage(imgEl, 0, 0, srcWidth, srcHeight);

                    const cropPresets = [
                        { x: 0, y: 0, w: 0.62, h: 1 },
                        { x: 0, y: 0, w: 0.72, h: 1 },
                        { x: 0, y: 0.08, w: 0.76, h: 0.84 },
                        { x: 0, y: 0.15, w: 0.68, h: 0.7 },
                        { x: 0.48, y: 0, w: 0.52, h: 1 },
                    ];

                    for (const preset of cropPresets) {
                        const testCanvas = document.createElement('canvas');
                        const testCtx = testCanvas.getContext('2d');
                        if (!testCtx) continue;
                        const sx = Math.round(srcWidth * preset.x);
                        const sy = Math.round(srcHeight * preset.y);
                        const sw = Math.max(1, Math.round(srcWidth * preset.w));
                        const sh = Math.max(1, Math.round(srcHeight * preset.h));
                        testCanvas.width = sw;
                        testCanvas.height = sh;
                        testCtx.drawImage(cropCanvas, sx, sy, sw, sh, 0, 0, sw, sh);

                        const testImg = new Image();
                        testImg.src = testCanvas.toDataURL('image/jpeg', 0.92);
                        await new Promise((resolve) => {
                            testImg.onload = resolve;
                            testImg.onerror = resolve;
                        });

                        const croppedFaces = await runDetectionsOn(testImg);
                        if (croppedFaces.length) return croppedFaces;
                    }
                }
            }

            if (forId) {
                throw new Error('Kindly take a clearer picture, or upload the right ID document.');
            }
            throw new Error('Kindly retake your selfie in better lighting and face the camera directly.');
        }

        function handleIdTypeChange() {
            const val = document.getElementById('auth-idType').value;
            const container = document.getElementById('idNumber-container');
            const input = document.getElementById('auth-idNumber');
            clearError('idType-error');
            if (val) {
                container.classList.remove('hidden-screen');
                input.value = '';
                if (val === 'nin') {
                    input.placeholder = '11 Digit NIN';
                    input.maxLength = 11;
                } else if (val === 'passport') {
                    input.placeholder = 'Passport Number';
                    input.maxLength = 10;
                } else if (val === 'license') {
                    input.placeholder = "Driver's License";
                    input.maxLength = 12;
                }
            }
            else { container.classList.add('hidden-screen'); }
        }
 
        function handlePhoneInput(e) { clearError('phone-error'); e.target.value = e.target.value.replace(/\D/g, '').slice(0, 13); }
        function handlePinInput(e) { clearError('pin-error'); e.target.value = e.target.value.replace(/\D/g, '').slice(0, 4); }
        function handleIdNumberInput(e) {
            clearError('idNumber-error');
            const val = document.getElementById('auth-idType').value;
            if (val === 'nin') {
                e.target.value = e.target.value.replace(/\D/g, '').slice(0, 11);
            } else if (val === 'passport') {
                e.target.value = e.target.value.slice(0, 10);
            } else if (val === 'license') {
                e.target.value = e.target.value.slice(0, 12);
            }
        }

        function setSelectOptions(selectId, placeholder, values) {
            const el = document.getElementById(selectId);
            if (!el) return;
            const opts = [`<option value="" selected disabled>${placeholder}</option>`];
            values.forEach(v => opts.push(`<option value="${v}">${v}</option>`));
            el.innerHTML = opts.join('');
        }

        function normalizeCarData(raw) {
            const out = {};
            const years = raw && raw.data && raw.data[0] && Array.isArray(raw.data[0].years) ? raw.data[0].years : [];
            years.forEach(yearNode => {
                const yearKey = String(yearNode.year || '').trim();
                if (!yearKey) return;
                const makesMap = {};
                (yearNode.makes || []).forEach(makeNode => {
                    const makeName = String(makeNode.makeName || '').trim();
                    if (!makeName) return;
                    makesMap[makeName] = (makeNode.models || []).map(m => String(m.modelName || '').trim()).filter(Boolean);
                });
                if (Object.keys(makesMap).length > 0) out[yearKey] = makesMap;
            });
            return out;
        }

        function populateDriverCarYears() {
            const years = Object.keys(driverCarCatalog).sort((a, b) => Number(b) - Number(a));
            setSelectOptions('auth-car-year', 'Year', years);
            setSelectOptions('auth-car-make', 'Make', []);
            setSelectOptions('auth-car-model', 'Model', []);
        }

        function handleDriverCarYearChange() {
            const year = document.getElementById('auth-car-year').value;
            const makes = year && driverCarCatalog[year] ? Object.keys(driverCarCatalog[year]).sort() : [];
            setSelectOptions('auth-car-make', 'Make', makes);
            setSelectOptions('auth-car-model', 'Model', []);
        }

        function handleDriverCarMakeChange() {
            const year = document.getElementById('auth-car-year').value;
            const make = document.getElementById('auth-car-make').value;
            const models = year && make && driverCarCatalog[year] && driverCarCatalog[year][make] ? driverCarCatalog[year][make] : [];
            setSelectOptions('auth-car-model', 'Model', models);
        }

        async function loadDriverCarCatalog() {
            driverCarCatalog = FALLBACK_CAR_DATA;
            try {
                const res = await fetch(CAR_DATA_URL);
                if (!res.ok) throw new Error('car data request failed');
                const json = await res.json();
                const normalized = normalizeCarData(json);
                if (Object.keys(normalized).length > 0) {
                    driverCarCatalog = normalized;
                }
            } catch (err) {
                console.warn('Car catalog fallback in use:', err.message || err);
            }
            populateDriverCarYears();
        }
        
        function clearError(id) {
            const el = document.getElementById(id);
            if(el) { el.classList.add('hidden'); el.classList.remove('flex'); const input = el.previousElementSibling; if(input && input.tagName==='INPUT') input.classList.remove('input-error', 'animate-shake'); }
        }

        function clearCarError() {
            clearError('car-error');
            ['auth-car-year', 'auth-car-make', 'auth-car-model', 'auth-car-type'].forEach(id => {
                const el = document.getElementById(id);
                if (el) el.classList.remove('input-error', 'animate-shake');
            });
        }
 
        function showError(id, msg, inputId) {
            const el = document.getElementById(id);
            el.querySelector('.error-text').innerText = msg;
            el.classList.remove('hidden'); el.classList.add('flex');
            const input = document.getElementById(inputId);
            if(input) { input.classList.add('input-error', 'animate-shake'); setTimeout(() => input.classList.remove('animate-shake'), 300); }
        }
 
        function verifyAuthDriverAccount(e) {
            const input = e.target;
            input.value = input.value.replace(/\D/g, '');
            const nameField = document.getElementById('auth-driver-acc-name');
            const errorField = document.getElementById('auth-acc-num-error');
            
            if(input.value.length === 10) {
                nameField.value = "Verifying...";
                setTimeout(() => {
                    const typedName = document.getElementById('auth-name').value.trim();
                    nameField.value = typedName ? typedName.toUpperCase() : "POOLILY DRIVER";
                    nameField.classList.remove('text-red-500');
                    nameField.classList.add('text-green-600');
                    errorField.classList.add('hidden');
                    errorField.classList.remove('flex');
                }, 1000);
            } else {
                nameField.value = "";
                nameField.classList.remove('text-green-600');
                nameField.classList.add('text-slate-500');
            }
        }
 
        async function validateAuth(triggerBtn = null) {
            let isValid = true;
            const rawPhone = document.getElementById('auth-phone').value;
            const phone = normalizePhone(rawPhone);
            const pin = document.getElementById('auth-pin').value;
            
            if (phone.length < 11) { showError('phone-error', 'Phone must be a valid mobile number', 'auth-phone'); isValid = false; }
            if (pin.length !== 4) { showError('pin-error', 'PIN must be 4 digits', 'auth-pin'); isValid = false; }
 
            if (!isValid) return;
            if (!isBackendConfigured()) {
                setAuthServerMessage('error', 'Backend is not configured. Open console and run setPoolilyBackendUrl("YOUR_SUPABASE_FUNCTION_URL").');
                return;
            }
            if (actionLocks.auth_submit) return;
            actionLocks.auth_submit = true;

            setAuthServerMessage('', '');
            setAuthSubmitLoading(true);
 
            try {
                if (state.authMode === 'signup') {
                    const name = document.getElementById('auth-name').value.trim();
                    const plateNum = document.getElementById('auth-plateNumber').value;
                    const idType = document.getElementById('auth-idType').value;
                    const idNumber = document.getElementById('auth-idNumber').value;
                    const tcChecked = document.getElementById('auth-tc').checked;
                    
                    if (name.length < 2) { showError('name-error', 'Enter valid name', 'auth-name'); isValid = false; }
                    if (state.role === 'driver' && plateNum.length < 5) { showError('plate-error', 'Enter valid Plate', 'auth-plateNumber'); isValid = false; }
                    if (!idType) { showError('idType-error', 'Please select an ID type', 'auth-idType'); isValid = false; }
                    
                    if (idType === 'nin' && idNumber.length !== 11) {
                        showError('idNumber-error', 'NIN must be exactly 11 digits', 'auth-idNumber'); isValid = false;
                    } else if (idType && idNumber.length < 5) {
                        showError('idNumber-error', 'Please enter a valid ID number', 'auth-idNumber'); isValid = false;
                    }
    
                    if (!tcChecked) { showError('tc-error', 'Must accept Terms & Privacy Policy', null); isValid = false; }
                    
                    if (!authIdData) {
                        const status = document.getElementById('auth-id-status');
                        status.innerText = "Please upload ID document";
                        status.className = 'text-red-500 text-sm font-black mt-2 text-center bg-white/50 py-1 rounded-full mx-8 border border-red-200';
                        isValid = false;
                    } else if (!authIdTemplateMatch || !authIdTemplateMatch.confident) {
                        const status = document.getElementById('auth-id-status');
                        status.innerText = "Kindly take a clearer picture, or upload the right ID document.";
                        status.className = 'text-red-500 text-sm font-black mt-2 text-center bg-white/50 py-1 rounded-full mx-8 border border-red-200';
                        isValid = false;
                    }
    
                    if (state.role === 'driver') {
                    const bankSelect = document.getElementById('auth-driver-bank');
                    const accInput = document.getElementById('auth-driver-acc-num');
                    const bankAccNum = accInput.value;
                    const carYear = document.getElementById('auth-car-year').value;
                    const carMake = document.getElementById('auth-car-make').value;
                        const carModel = document.getElementById('auth-car-model').value;
                        const carType = document.getElementById('auth-car-type').value;
                        
                        if(bankAccNum.length !== 10) { showError('auth-acc-num-error', '10 digit account required', 'auth-driver-acc-num'); isValid = false; }
                        if(!carYear || !carMake || !carModel || !carType) { showError('car-error', 'Select year, make, model and type', 'auth-car-year'); isValid = false; }
                    }
    
                    if(!authSelfieData) {
                        const err = document.getElementById('auth-selfie-error');
                        if (err) { err.classList.remove('hidden'); err.classList.add('flex'); }
                        isValid = false;
                    }
    
                    if (!isValid) return;

                    const phoneCheck = await backendRequest('checkUserByPhone', { phone });
                    if (phoneCheck.exists) {
                        if (phoneCheck.role && phoneCheck.role !== state.role) {
                            setAuthServerMessage('error', `This phone number is already registered as a ${phoneCheck.role} account.`);
                        } else {
                            setAuthServerMessage('error', 'This phone number is already registered. Please log in instead.');
                        }
                        return;
                    }

                    const verified = await runFaceVerification();
                    if (!verified) {
                        setAuthServerMessage('error', 'Identity verification failed. Please re-upload clear selfie and ID photo.');
                        return;
                    }

                    const signupPayload = getAuthPayload();
                    const response = await backendRequest('registerUser', { ...signupPayload, pin });
                    hydrateUserFromBackend(response.user || {}, state.role);
                    setAuthServerMessage('success', 'Profile created successfully.');
                    await syncRecord('Events', {
                        event: 'signup_success',
                        userId: state.user.id,
                        role: state.role,
                        phone: normalizePhone(state.user.phone)
                    }, 'append', '', '', true);
                } else {
                    const response = await backendRequest('loginUser', {
                        phone,
                        role: state.role,
                        pin
                    });
                    hydrateUserFromBackend(response.user || {}, state.role);
                    await syncRecord('Events', {
                        event: 'login_success',
                        userId: state.user.id,
                        role: state.role,
                        phone: normalizePhone(state.user.phone)
                    }, 'append', '', '', true);
                }

                await loadRideHistory({ silent: true });
                setupDestinationScreen();
                setStep('destination');
            } catch (err) {
                if (err.code === 'USER_EXISTS') {
                    setAuthServerMessage('error', 'This phone number is already registered. Please log in instead.');
                } else if (err.code === 'USER_ROLE_MISMATCH') {
                    setAuthServerMessage('error', 'This phone number is already linked to a different account type.');
                } else if (err.code === 'INVALID_PIN' || err.code === 'USER_NOT_FOUND') {
                    setAuthServerMessage('error', 'Login failed. Check phone/PIN and try again.');
                } else {
                    setAuthServerMessage('error', err.message || 'Could not complete request. Please try again.');
                }
            } finally {
                setAuthSubmitLoading(false);
                actionLocks.auth_submit = false;
            }
        }
 
        async function runFaceVerification() {
            const overlay = document.getElementById('verification-overlay');
            const idImg = document.getElementById('verify-id-img');
            const selfieImg = document.getElementById('verify-selfie-img');
            const statusText = document.getElementById('verify-status-text');
            const percText = document.getElementById('verify-percentage');
            const progBar = document.getElementById('verify-progress-bar');
            const successDiv = document.getElementById('verify-success');
            
            // Ensure we have valid image data
            if (!authIdData || !authSelfieData) {
                showSystemMessage("Missing ID or selfie data for verification.", "Verification Required", "error");
                return false;
            }
 
            // Populate images
            idImg.src = authIdData;
            selfieImg.src = authSelfieData;
            
            overlay.classList.remove('hidden');
            overlay.classList.add('flex');
            
            // Reset UI
            progBar.style.width = '0%';
            progBar.className = 'h-full bg-blue-500 w-0 transition-all duration-500 ease-out';
            percText.innerText = '0%';
            percText.className = 'text-slate-400 transition-colors duration-300';
            statusText.innerText = 'Initializing AI Models...';
            statusText.className = 'text-slate-400 transition-colors duration-300';
            
            successDiv.classList.add('hidden');
            successDiv.classList.remove('flex');
            idImg.classList.add('grayscale', 'opacity-40');
            selfieImg.classList.add('grayscale', 'opacity-40');
            document.getElementById('scan-line-1').classList.remove('hidden');
            document.getElementById('scan-line-2').classList.remove('hidden');
            
            lucide.createIcons();
 
            const updateProgress = (perc, text) => {
                progBar.style.width = perc + '%';
                percText.innerText = perc + '%';
                statusText.innerText = text;
            };
 
            try {
                updateProgress(15, 'Downloading Neural Nets (~5MB)...');
                
                // Load face-api models from reliable CDN
                const MODEL_URL = 'https://justadudewhohacks.github.io/face-api.js/models';
                await Promise.all([
                    faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL),
                    faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
                    faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
                    faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
                    faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL)
                ]);
 
                updateProgress(40, 'Locating face in ID Document...');
                await new Promise(r => { idImg.complete ? r() : idImg.onload = r });
                const idFaces = await detectFacesRobust(idImg, { forId: true });
                if (!idFaces.length) throw new Error('Kindly take a clearer picture, or upload the right ID document.');
                const idResult = idFaces[0];
                if ((idResult.detection?.score || 0) < Math.max(0.35, FACE_MIN_DETECTION_SCORE - 0.3)) {
                    throw new Error('ID photo is too unclear for safe verification.');
                }

                updateProgress(70, 'Checking for a smiling live selfie...');
                await new Promise(r => { selfieImg.complete ? r() : selfieImg.onload = r });
                const selfieFaces = await detectFacesRobust(selfieImg, { forId: false, includeExpressions: true });
                if (!selfieFaces.length) throw new Error('Kindly retake your selfie in better lighting and face the camera directly.');
                const selfieResult = selfieFaces[0];
                const selfieSecondFace = selfieFaces[1];
                const primarySelfieArea = (selfieResult.detection?.box?.width || 0) * (selfieResult.detection?.box?.height || 0);
                const secondarySelfieArea = selfieSecondFace ? ((selfieSecondFace.detection?.box?.width || 0) * (selfieSecondFace.detection?.box?.height || 0)) : 0;
                if (selfieFaces.length > 1 && secondarySelfieArea > 0 && (primarySelfieArea / secondarySelfieArea) < 1.45) {
                    throw new Error('Selfie must show one dominant face only.');
                }
                if ((selfieResult.detection?.score || 0) < Math.max(0.45, FACE_MIN_DETECTION_SCORE - 0.2)) {
                    throw new Error('Selfie is too unclear for safe verification.');
                }
                const smileScore = Number(selfieResult.expressions?.happy || 0);
                if (smileScore < 0.78) {
                    throw new Error('Please smile clearly in your selfie before continuing.');
                }

                updateProgress(90, 'Smile confirmed. Computing facial similarity...');
                const distance = faceapi.euclideanDistance(idResult.descriptor, selfieResult.descriptor);
                
                if (distance <= FACE_MATCH_MAX_DISTANCE) {
                    const matchScore = ((1 - distance) * 100).toFixed(1);
                    updateProgress(100, `Match Confirmed: ${matchScore}% Similarity`);
                    progBar.classList.replace('bg-blue-500', 'bg-green-500');
                    statusText.classList.replace('text-slate-400', 'text-green-400');
                    percText.classList.replace('text-slate-400', 'text-green-400');
                    
                    idImg.classList.remove('grayscale', 'opacity-40');
                    selfieImg.classList.remove('grayscale', 'opacity-40');
                    
                    // Hide scan lines
                    document.getElementById('scan-line-1').classList.add('hidden');
                    document.getElementById('scan-line-2').classList.add('hidden');
                    
                    successDiv.classList.remove('hidden');
                    successDiv.classList.add('flex');
                    await new Promise(resolve => setTimeout(resolve, 1500));
                    overlay.classList.add('hidden');
                    overlay.classList.remove('flex');
                    return true;
                } else {
                    throw new Error('Face match failed. Please retry with a clearer selfie.');
                }
 
            } catch (err) {
                updateProgress(100, err.message || 'Verification Error');
                progBar.classList.replace('bg-blue-500', 'bg-red-500');
                statusText.classList.replace('text-slate-400', 'text-red-400');
                percText.classList.replace('text-slate-400', 'text-red-400');
                document.getElementById('scan-line-1').classList.add('hidden');
                document.getElementById('scan-line-2').classList.add('hidden');
                
                // Wait a few seconds, then close overlay so they can try again
                setTimeout(() => {
                    overlay.classList.add('hidden');
                    overlay.classList.remove('flex');
                }, 4000);
                return false;
            }
        }
 
        function handleLogout() {
            if (state.user) {
                syncRecord('Events', { event: 'logout', userId: state.user.id, role: state.role });
            }
            state.user = null;
            state.role = null;
            persistUserSession();
            setStep('idle', 'home');
        }
 
        // --- HISTORY & TRANSACTIONS LOGIC --- //
        function setHistoryMode(mode) {
            state.historyMode = mode;
            const btnRides = document.getElementById('tab-hist-rides');
            const btnTrans = document.getElementById('tab-hist-trans');
            const listRides = document.getElementById('history-list');
            const listTrans = document.getElementById('transaction-list');
            
            if (mode === 'rides') {
                btnRides.className = "flex-1 py-2.5 rounded-2xl font-black text-sm transition-all duration-300 bg-white shadow-[0_4px_10px_rgba(0,0,0,0.05)] text-blue-600 scale-100";
                btnTrans.className = "flex-1 py-2.5 rounded-2xl font-black text-sm transition-all duration-300 text-slate-500 hover:text-slate-700 scale-95";
                listRides.classList.remove('hidden');
                listTrans.classList.add('hidden');
                if (state.user) loadRideHistory({ silent: true }).then(() => renderHistory());
            } else {
                btnTrans.className = "flex-1 py-2.5 rounded-2xl font-black text-sm transition-all duration-300 bg-white shadow-[0_4px_10px_rgba(0,0,0,0.05)] text-blue-600 scale-100";
                btnRides.className = "flex-1 py-2.5 rounded-2xl font-black text-sm transition-all duration-300 text-slate-500 hover:text-slate-700 scale-95";
                listTrans.classList.remove('hidden');
                listRides.classList.add('hidden');
                renderHistory(); // Ensure transactions are up to date
            }
        }
 
        // --- PROFILE & SETTINGS LOGIC --- //
        function renderProfile() {
            if(!state.user) return;
            document.getElementById('profile-name').innerText = state.user.name;
            document.getElementById('profile-phone').innerText = state.user.phone;
            document.getElementById('home-user-name').innerText = `Hi, ${state.user.name.split(' ')[0]}`;
            document.getElementById('home-user-initial').innerText = state.user.name.charAt(0).toUpperCase();
            
            // Set Profile Photo if available
            const img = document.getElementById('profile-display-img');
            const fallback = document.getElementById('profile-emoji-fallback');
            if(state.user.profilePhoto) {
                img.src = state.user.profilePhoto;
                img.classList.remove('hidden');
                fallback.classList.add('hidden');
            } else {
                img.src = "";
                img.classList.add('hidden');
                fallback.classList.remove('hidden');
            }
 
            // Passenger Wallet vs Driver Payout
            const walletSec = document.getElementById('profile-wallet');
            const payoutSec = document.getElementById('profile-payout');
            const walletBankInfo = document.getElementById('wallet-bank-info');
            
            // 1. Wallet is visible to EVERYONE
            walletSec.classList.remove('hidden');
            walletSec.classList.add('flex');
            
            document.getElementById('wallet-balance').innerHTML = `₦${state.user.wallet.balance.toLocaleString()}<span class="text-sm text-slate-400">.00</span>`;
            
            // Hide specific Stanbic bank info based on role
            if (state.role === 'driver') {
                if (walletBankInfo) walletBankInfo.classList.add('hidden');
            } else {
                if (walletBankInfo) walletBankInfo.classList.remove('hidden');
                document.getElementById('wallet-acc-num').innerText = formatWalletAccountNumber(state.user.wallet.accountNumber);
                document.getElementById('wallet-acc-name').innerText = `Poolily - ${state.user.name}`;
            }
            
            // Only show up to 3 recent in the profile mini-view
            const recentTx = state.user.wallet.history.slice(0, 3);
            const historyHtml = recentTx.map(tx => `
                <div class="flex justify-between items-center pb-3 border-b border-slate-50 last:border-0 last:pb-0">
                    <div class="flex items-center gap-3">
                        <div class="w-8 h-8 rounded-full ${tx.type==='credit'?'bg-green-100 text-green-600':'bg-red-100 text-red-500'} flex items-center justify-center">
                            <i data-lucide="${tx.type==='credit'?'arrow-down-left':'arrow-up-right'}" width="14"></i>
                        </div>
                        <div><p class="text-sm font-black text-slate-700">${tx.desc}</p><p class="text-[10px] font-bold text-slate-400">${tx.date}</p></div>
                    </div>
                    <span class="font-black ${tx.type==='credit'?'text-green-500':'text-slate-700'}">${tx.amount}</span>
                </div>
            `).join('') || '<p class="text-xs font-bold text-slate-400 text-center py-2">No recent transactions</p>';
            document.getElementById('wallet-history').innerHTML = historyHtml;
 
            // 2. Payout is visible to DRIVERS ONLY
            if(state.role === 'driver') {
                payoutSec.classList.remove('hidden');
                payoutSec.classList.add('flex');

                const carMakeEl = document.getElementById('profile-car-make');
                const carModelEl = document.getElementById('profile-car-model');
                const carYearEl = document.getElementById('profile-car-year');
                const carTypeEl = document.getElementById('profile-car-type');
                const carPlateEl = document.getElementById('profile-car-plate');
                if (carMakeEl) carMakeEl.innerText = state.user.carMake || '-';
                if (carModelEl) carModelEl.innerText = state.user.carModel || '-';
                if (carYearEl) carYearEl.innerText = state.user.carYear || '-';
                if (carTypeEl) carTypeEl.innerText = state.user.carType || '-';
                if (carPlateEl) carPlateEl.innerText = state.user.plateNumber || '-';

                // Pre-fill fields if they exist
                if (state.user.bankDetails && (state.user.bankDetails.bankName || state.user.bankDetails.bankCode)) {
                    document.getElementById('driver-bank-select').value = state.user.bankDetails.bankName || state.user.bankDetails.bankCode;
                    document.getElementById('driver-acc-num').value = state.user.bankDetails.accountNumber;
                    document.getElementById('driver-acc-name').value = state.user.bankDetails.accountName;
                }
            } else {
                payoutSec.classList.add('hidden');
                payoutSec.classList.remove('flex');
            }
            
            lucide.createIcons();
        }
 
        // Dynamic Withdrawal for Driver
        function handleWithdrawal() {
            if (!state.user) return;
            
            if(state.user.wallet.balance <= 0) {
                showSystemMessage("Insufficient funds to withdraw.", "Withdrawal Failed", "error");
                return;
            }
 
            const bank = document.getElementById('driver-bank-select').options[document.getElementById('driver-bank-select').selectedIndex].text;
            const accNum = document.getElementById('driver-acc-num').value;
            
            if(!accNum || accNum.length !== 10 || bank === 'Select Bank') {
                showSystemMessage("Please fill out your complete bank account details before withdrawing.", "Incomplete Details", "error");
                return;
            }
 
            const amount = state.user.wallet.balance;
            state.user.wallet.balance = 0; // Empty the wallet
            
            state.user.wallet.history.unshift({
                desc: "Payout to Bank",
                amount: `-₦${amount.toLocaleString()}`,
                date: "Just now",
                type: "debit"
            });
            
            persistUserSession();
            renderProfile();
            syncRecord('WalletTransactions', {
                userId: state.user.id,
                role: state.role,
                type: 'debit',
                amount,
                description: `Payout to ${bank}`,
                bank,
                accountNumber: accNum,
                balanceAfter: state.user.wallet.balance
            });
            syncRecord('Users', {
                userId: state.user.id,
                walletBalance: state.user.wallet.balance,
                walletHistory: state.user.wallet.history,
                bankDetails: { bankCode: document.getElementById('driver-bank-select').value, bankName: document.getElementById('driver-bank-select').value, accountNumber: accNum, accountName: document.getElementById('driver-acc-name').value }
            }, 'upsert', 'userId', state.user.id);
            showSystemMessage(`Successfully withdrew ₦${amount.toLocaleString()} to your ${bank} account.`, "Withdrawal Successful", "success");
        }
 
        async function handleProfilePhoto(e) {
            const file = e.target.files && e.target.files[0];
            if (!file) return;
            let photoData = '';
            try {
                photoData = await compressImageFile(file);
            } catch (err) {
                console.warn('Profile photo compression failed, using original image:', err);
                photoData = await readFileAsDataUrl(file);
            }
            const img = document.getElementById('profile-display-img');
            img.src = photoData;
            img.classList.remove('hidden');
            document.getElementById('profile-emoji-fallback').classList.add('hidden');
            if(state.user) {
                state.user.profilePhoto = photoData;
                persistUserSession();
                try {
                    await syncRecord('Users', {
                        userId: state.user.id,
                        profilePhoto: state.user.profilePhoto
                    }, 'upsert', 'userId', state.user.id, true);
                } catch (err) {
                    showSystemMessage(err.message || 'Could not save profile photo to your account.', 'Profile Update Failed', 'error');
                    return;
                }
                showSystemMessage('Profile photo updated successfully.', 'Profile Updated', 'success');
            }
        }

        async function submitPinChange(btn) {
            if (!state.user) return;
            const currentPin = document.getElementById('pin-current').value;
            const newPin = document.getElementById('pin-new').value;
            const confirmPin = document.getElementById('pin-confirm').value;

            if (currentPin.length !== 4 || newPin.length !== 4 || confirmPin.length !== 4) {
                showSystemMessage('Current PIN, new PIN, and confirmation PIN must all be 4 digits.', 'Invalid PIN', 'error');
                return;
            }
            if (newPin !== confirmPin) {
                showSystemMessage('New PIN and confirmation PIN do not match.', 'PIN Mismatch', 'error');
                return;
            }
            if (currentPin === newPin) {
                showSystemMessage('New PIN must be different from your current PIN.', 'PIN Unchanged', 'error');
                return;
            }
            if (!beginActionLock('pin_change', btn, 'Updating PIN...')) return;
            try {
                const response = await backendRequest('changePin', {
                    userId: state.user.id,
                    phone: state.user.phone,
                    currentPin,
                    newPin
                });
                hydrateUserFromBackend(response.user || state.user, state.role);
                ['pin-current', 'pin-new', 'pin-confirm'].forEach(id => {
                    const el = document.getElementById(id);
                    if (el) el.value = '';
                });
                closeModal();
                showSystemMessage('Your PIN has been updated successfully.', 'PIN Updated', 'success');
            } catch (err) {
                showSystemMessage(err.message || 'Could not update your PIN right now.', 'PIN Update Failed', 'error');
            } finally {
                endActionLock('pin_change', btn);
            }
        }

        async function submitFeedbackComplaint(btn) {
            if (!state.user) return;
            const category = document.getElementById('complaint-category').value;
            const message = document.getElementById('complaint-message').value.trim();

            if (message.length < 8) {
                showSystemMessage('Please add more detail before submitting your feedback.', 'More Detail Needed', 'error');
                return;
            }
            if (!beginActionLock('complaint_submit', btn, 'Submitting...')) return;
            try {
                await syncRecord('Events', {
                    event: 'feedback_complaint_submitted',
                    userId: state.user.id,
                    role: state.role,
                    category,
                    message,
                    activeRideId: state.activeRide ? state.activeRide.id : null,
                    activeRideRequestId: state.activeRideRequest ? state.activeRideRequest.id : null,
                    submittedAt: new Date().toISOString()
                }, 'append', '', '', true);
                document.getElementById('complaint-message').value = '';
                document.getElementById('complaint-category').selectedIndex = 0;
                closeModal();
                showSystemMessage('Your feedback has been saved. We will review it shortly.', 'Feedback Submitted', 'success');
            } catch (err) {
                showSystemMessage(err.message || 'Could not save your feedback right now.', 'Submission Failed', 'error');
            } finally {
                endActionLock('complaint_submit', btn);
            }
        }
 
        function populateBanks() {
            const sortedBanks = [...BANK_NAMES].sort();
            // Target both the auth signup select and the profile select
            ['driver-bank-select', 'auth-driver-bank'].forEach(selectId => {
                const select = document.getElementById(selectId);
                if (select) {
                    sortedBanks.forEach(bank => {
                        const opt = document.createElement('option');
                        opt.value = bank;
                        opt.text = bank;
                        select.appendChild(opt);
                    });
                }
            });
        }
 
        function verifyDriverAccount(e) {
            const input = e.target;
            input.value = input.value.replace(/\D/g, '');
            const nameField = document.getElementById('driver-acc-name');
            const errorField = document.getElementById('payout-error');
            if (!nameField || !errorField) return;
            verifyAccountToken += 1;
            const currentToken = verifyAccountToken;
            if (verifyAccountTimer) {
                clearTimeout(verifyAccountTimer);
                verifyAccountTimer = null;
            }
            
            if(input.value.length === 10) {
                // Simulate verification delay
                nameField.value = "Verifying...";
                nameField.classList.remove('text-red-500', 'text-green-600');
                nameField.classList.add('text-slate-500');
                verifyAccountTimer = setTimeout(() => {
                    verifyAccountTimer = null;
                    if (currentToken !== verifyAccountToken) return;
                    const liveInput = document.getElementById('driver-acc-num');
                    const liveNameField = document.getElementById('driver-acc-name');
                    const liveErrorField = document.getElementById('payout-error');
                    if (!liveInput || !liveNameField || !liveErrorField || !document.body.contains(liveNameField)) return;
                    if (liveInput.value.length !== 10) return;
                    // Auto match name for demo purposes if valid, else show error
                    if(state.user && state.user.name) {
                        liveNameField.value = state.user.name.toUpperCase();
                        liveNameField.classList.remove('text-red-500');
                        liveNameField.classList.add('text-green-600');
                        liveErrorField.classList.add('hidden');
                        liveErrorField.classList.remove('flex');
                    }
                }, 1000);
            } else {
                nameField.value = "";
                nameField.classList.remove('text-red-500');
                nameField.classList.remove('text-green-600');
                nameField.classList.add('text-slate-500');
                errorField.classList.add('hidden');
                errorField.classList.remove('flex');
            }
        }
 
        // Modals
        function openModal(contentId) {
            // Safety check: ensure '-content' suffix exists
            const targetId = contentId.endsWith('-content') ? contentId : contentId + '-content';
            
            const modal = document.getElementById('app-modal');
            const inner = document.getElementById('app-modal-inner');
            
            ['pin-modal-content', 'support-modal-content', 'complaint-modal-content', 'about-modal-content'].forEach(id => {
                const el = document.getElementById(id);
                if(el) { el.classList.add('hidden'); el.classList.remove('flex'); }
            });
            
            const targetEl = document.getElementById(targetId);
            if (targetEl) {
                targetEl.classList.remove('hidden');
                targetEl.classList.add('flex');
            }
 
            modal.classList.remove('hidden'); modal.classList.add('flex');
            setTimeout(() => {
                modal.classList.remove('opacity-0');
                if(window.innerWidth < 768) inner.classList.remove('translate-y-full');
                else { inner.classList.remove('scale-95'); inner.classList.add('scale-100'); }
            }, 10);
        }
 
        function closeModal() {
            const modal = document.getElementById('app-modal');
            const inner = document.getElementById('app-modal-inner');
            
            modal.classList.add('opacity-0');
            if(window.innerWidth < 768) inner.classList.add('translate-y-full');
            else { inner.classList.remove('scale-100'); inner.classList.add('scale-95'); }
            
            setTimeout(() => {
                modal.classList.add('hidden'); modal.classList.remove('flex');
            }, 300);
        }

        function positionSystemMessage() {
            const inner = document.getElementById('system-message-inner');
            if (!inner) return;

            inner.style.position = 'fixed';
            inner.style.width = `${Math.min(360, window.innerWidth - 24)}px`;
            inner.style.left = `${Math.max(12, (window.innerWidth - Math.min(360, window.innerWidth - 24)) / 2)}px`;
            inner.style.right = 'auto';
            inner.style.top = `${Math.max(24, (window.innerHeight - inner.offsetHeight) / 2)}px`;
            inner.style.bottom = 'auto';
        }

        function showSystemMessage(message, title = 'Notice', type = 'info', anchorTarget = null) {
            const modal = document.getElementById('system-message-modal');
            const inner = document.getElementById('system-message-inner');
            const titleEl = document.getElementById('system-message-title');
            const textEl = document.getElementById('system-message-text');
            const iconWrap = document.getElementById('system-message-icon-wrap');
            const icon = document.getElementById('system-message-icon');
            if (!modal || !inner || !titleEl || !textEl || !iconWrap || !icon) return;
            systemMessageAnchorTarget = anchorTarget instanceof HTMLElement ? anchorTarget : null;

            titleEl.innerText = title;
            textEl.innerText = message;

            if (type === 'error') {
                iconWrap.className = 'w-11 h-11 rounded-xl bg-red-100 text-red-600 flex items-center justify-center shrink-0';
                icon.setAttribute('data-lucide', 'alert-triangle');
            } else if (type === 'success') {
                iconWrap.className = 'w-11 h-11 rounded-xl bg-green-100 text-green-600 flex items-center justify-center shrink-0';
                icon.setAttribute('data-lucide', 'check-circle-2');
            } else {
                iconWrap.className = 'w-11 h-11 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center shrink-0';
                icon.setAttribute('data-lucide', 'info');
            }

            modal.classList.remove('hidden');
            modal.classList.add('flex');
            setTimeout(() => {
                positionSystemMessage();
                modal.classList.remove('opacity-0');
                inner.classList.remove('translate-y-6');
                inner.classList.add('translate-y-0');
                lucide.createIcons();
            }, 10);
        }

        function closeSystemMessage() {
            const modal = document.getElementById('system-message-modal');
            const inner = document.getElementById('system-message-inner');
            if (!modal || !inner) return;

            modal.classList.add('opacity-0');
            inner.classList.remove('translate-y-0');
            inner.classList.add('translate-y-6');

            setTimeout(() => {
                modal.classList.add('hidden');
                modal.classList.remove('flex');
                inner.style.position = '';
                inner.style.width = '';
                inner.style.left = '';
                inner.style.right = '';
                inner.style.top = '';
                inner.style.bottom = '';
                systemMessageAnchorTarget = null;
            }, 300);
        }

        function openCancelTripModal() {
            const modal = document.getElementById('cancel-trip-modal');
            const inner = document.getElementById('cancel-trip-inner');
            const optionsWrap = document.getElementById('cancel-trip-options');
            const otherField = document.getElementById('cancel-trip-other');
            const subtitle = document.getElementById('cancel-trip-subtitle');
            if (!modal || !inner || !optionsWrap || !otherField || !subtitle) return;

            subtitle.innerText = `${state.role === 'driver' ? 'Driver' : 'Passenger'} initiated cancellation. Tell us why.`;
            otherField.value = '';
            otherField.classList.add('hidden');
            state.cancellationReason = '';

            optionsWrap.innerHTML = cancellationOptions.map((reason, idx) => `
                <button type="button" data-cancel-idx="${idx}" class="cancel-reason-option w-full text-left bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-black text-slate-700 hover:bg-slate-50 active:scale-[0.99] transition-all">
                    ${reason}
                </button>
            `).join('');
            optionsWrap.querySelectorAll('.cancel-reason-option').forEach((btn) => {
                btn.addEventListener('click', () => {
                    const idx = Number(btn.dataset.cancelIdx);
                    const selected = cancellationOptions[idx] || '';
                    selectCancelReason(selected);
                    optionsWrap.querySelectorAll('.cancel-reason-option').forEach((x) => {
                        x.classList.remove('border-blue-500', 'bg-blue-50', 'text-blue-700');
                    });
                    btn.classList.add('border-blue-500', 'bg-blue-50', 'text-blue-700');
                });
            });

            modal.classList.remove('hidden');
            modal.classList.add('flex');
            setTimeout(() => {
                modal.classList.remove('opacity-0');
                inner.classList.remove('translate-y-6');
                inner.classList.add('translate-y-0');
            }, 10);
        }

        function selectCancelReason(reason) {
            state.cancellationReason = reason;
            const otherField = document.getElementById('cancel-trip-other');
            if (!otherField) return;
            if (reason === 'Other') {
                otherField.classList.remove('hidden');
                otherField.focus();
            } else {
                otherField.classList.add('hidden');
            }
        }

        function closeCancelTripModal() {
            const modal = document.getElementById('cancel-trip-modal');
            const inner = document.getElementById('cancel-trip-inner');
            if (!modal || !inner) return;

            modal.classList.add('opacity-0');
            inner.classList.remove('translate-y-0');
            inner.classList.add('translate-y-6');
            setTimeout(() => {
                modal.classList.add('hidden');
                modal.classList.remove('flex');
            }, 300);
        }

        async function submitTripCancellation(triggerBtn = null) {
            const btn = triggerBtn || document.activeElement;
            if (!beginActionLock('submit_cancel_trip', btn, 'Cancelling...')) return;
            const otherField = document.getElementById('cancel-trip-other');
            let reason = state.cancellationReason;
            if (reason === 'Other') {
                reason = (otherField && otherField.value ? otherField.value.trim() : '');
            }
            if (!reason) {
                showSystemMessage('Please select a cancellation reason.', 'Reason Required', 'error');
                endActionLock('submit_cancel_trip', btn);
                return;
            }

            closeCancelTripModal();
            try {
                await finalizeTrip('cancelled', reason);
            } finally {
                endActionLock('submit_cancel_trip', btn);
            }
        }
 
        // --- CAMERA LOGIC --- //
        let videoStream = null;
        let currentCameraTarget = null;
 
        async function openCamera(target) {
            currentCameraTarget = target;
            const modal = document.getElementById('camera-modal');
            const inner = document.getElementById('camera-modal-inner');
            const video = document.getElementById('camera-feed');
            
            modal.classList.remove('hidden');
            modal.classList.add('flex');
            
            setTimeout(() => {
                modal.classList.remove('opacity-0');
                inner.classList.remove('scale-95');
                inner.classList.add('scale-100');
            }, 10);
            
            try {
                videoStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } });
                video.srcObject = videoStream;
            } catch (err) {
                console.error("Camera access error:", err);
                showSystemMessage("Unable to access camera. Please allow permissions.", "Camera Access Blocked", "error");
                closeCamera();
            }
        }
 
        function closeCamera() {
            const modal = document.getElementById('camera-modal');
            const inner = document.getElementById('camera-modal-inner');
            
            modal.classList.add('opacity-0');
            inner.classList.remove('scale-100');
            inner.classList.add('scale-95');
            
            setTimeout(() => {
                modal.classList.add('hidden');
                modal.classList.remove('flex');
                if (videoStream) {
                    videoStream.getTracks().forEach(track => track.stop());
                    videoStream = null;
                }
            }, 300);
        }
 
        function takeSnapshot() {
            if(!videoStream) return;
            const video = document.getElementById('camera-feed');
            const canvas = document.getElementById('camera-canvas');
            const ctx = canvas.getContext('2d');
            if (!ctx) return;
            
            const sourceWidth = video.videoWidth;
            const sourceHeight = video.videoHeight;
            const longest = Math.max(sourceWidth, sourceHeight);
            const scale = longest > MAX_IMAGE_SIDE ? (MAX_IMAGE_SIDE / longest) : 1;
            canvas.width = Math.max(1, Math.round(sourceWidth * scale));
            canvas.height = Math.max(1, Math.round(sourceHeight * scale));
            
            ctx.setTransform(1, 0, 0, 1, 0, 0);
            ctx.translate(canvas.width, 0);
            ctx.scale(-1, 1);
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            
            const dataUrl = canvas.toDataURL('image/jpeg', IMAGE_COMPRESSION_QUALITY);
            
            if (currentCameraTarget === 'auth') {
                authSelfieData = dataUrl;
                document.getElementById('auth-selfie-preview').innerHTML = `<img src="${dataUrl}" class="w-full h-full object-cover rounded-full" />`;
                const err = document.getElementById('auth-selfie-error');
                if(err) { err.classList.add('hidden'); err.classList.remove('flex'); }
            } else if (currentCameraTarget === 'passenger') {
                state.rideDetails.passengerPhoto = dataUrl;
            }
            
            closeCamera();
        }
 
        // --- DESTINATION SCREEN & MAP LOGIC --- //
        function setupDestinationScreen() {
            const heading = document.getElementById('dest-heading');
            const btn = document.getElementById('btn-request');
            const driverOptionsContainer = document.getElementById('driver-options-container');
            
            if (state.role === 'driver') {
                heading.innerHTML = "Where are you<br>heading back to?";
                btn.innerText = "Go Online & Wait";
                driverOptionsContainer.classList.remove('hidden'); driverOptionsContainer.classList.add('flex');
            } else {
                heading.innerHTML = "Where to in<br>the city?";
                btn.innerText = "Find a Ride & Save";
                driverOptionsContainer.classList.add('hidden'); driverOptionsContainer.classList.remove('flex');
            }
 
            document.getElementById('pickup-location').onchange = function() {
                const val = this.value;
                const coords = pickupCoords[val] || state.currentLocation;
                state.rideDetails.pickup = val;
                if(state.destMapInstance) {
                    state.destMapInstance.flyTo({center: [coords.lng, coords.lat], zoom: 16});
                }
                updateDestinationRoutePreview();
                updateDestinationSavingsBanner();
            };

            setTimeout(initDestinationMap, 100);
            updateDestinationSavingsBanner();
        }

        function updateDestinationSavingsBanner() {
            const banner = document.getElementById('dest-savings-banner');
            if (!banner) return;
            if (state.role !== 'passenger' || !state.rideDetails.area || !state.rideDetails.price) {
                banner.classList.add('hidden');
                return;
            }

            const comparison = getFareComparison(state.rideDetails.price);
            banner.innerHTML = `
                <p class="text-[11px] font-black text-green-700">Regular fare: ${formatNaira(comparison.regular)}</p>
                <p class="text-xs font-black text-green-600">Poolily fare: ${formatNaira(comparison.aero)} • You save: ${formatNaira(comparison.savings)}</p>
            `;
            banner.classList.remove('hidden');
        }

        function ensurePassengerWalletFunded(anchorTarget = null) {
            if (state.role !== 'passenger') return true;
            if (!state.user || !state.user.wallet) return true;
            if (state.user.wallet.balance > 0) return true;

            showSystemMessage("Wallet balance is ₦0. Transfer to the account shown on your profile to fund your wallet before ordering a ride.", "Wallet Not Funded", "error", anchorTarget);
            setStep('idle', 'profile');
            setTimeout(() => {
                const walletInfo = document.getElementById('wallet-bank-info');
                if (walletInfo) walletInfo.classList.add('animate-pulse');
            }, 120);
            return false;
        }
 
        function filterDestinations() {
            const query = document.getElementById('dest-search-input').value.toLowerCase();
            const dd = document.getElementById('dest-dropdown');
            
            const filtered = abujaDestinations.filter(d => d.area.toLowerCase().includes(query) || d.desc.toLowerCase().includes(query));
            
            let html = "";
            
            // Add flexible "Anywhere" option for drivers at the top
            if (state.role === 'driver' && ("anywhere".includes(query) || "city".includes(query) || query === "")) {
                html += `
                    <div class="p-4 border-b border-slate-100 hover:bg-blue-50 cursor-pointer transition-colors flex justify-between items-center bg-blue-50/60"
                         onclick="selectDestination('Anywhere in City', 0)">
                        <div class="flex items-center gap-3">
                            <div class="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">🌍</div>
                            <div>
                                <p class="font-black text-slate-700 text-sm">Anywhere in City</p>
                                <p class="text-xs font-bold text-slate-500 mt-0.5">I'm open to any route</p>
                            </div>
                        </div>
                        <span class="font-black text-blue-600 text-xs bg-blue-100 px-2 py-1 rounded-full">Flexible</span>
                    </div>
                `;
            }
            
            if(filtered.length > 0) {
                html += filtered.map(d => `
                    <div class="p-4 border-b border-slate-100 hover:bg-blue-50 cursor-pointer transition-colors flex justify-between items-center"
                         onclick="selectDestination('${d.area}', ${d.price})">
                        <div>
                            <p class="font-black text-slate-700 text-sm">${d.area}</p>
                            <p class="text-xs font-bold text-slate-500 mt-0.5">${d.desc}</p>
                        </div>
                        <span class="font-black text-blue-600 text-sm">₦${d.price.toLocaleString()}</span>
                    </div>
                `).join('');
            }
            
            if (html !== "") {
                dd.innerHTML = html;
                dd.classList.remove('hidden');
            } else {
                dd.innerHTML = `<div class="p-4 text-center text-slate-400 font-bold text-sm">No exact areas found. Try Wuse, Lugbe...</div>`;
                dd.classList.remove('hidden');
            }
        }
 
        function selectDestination(area, price) {
            document.getElementById('dest-search-input').value = area;
            document.getElementById('dest-dropdown').classList.add('hidden');
            state.rideDetails.area = area;
            state.rideDetails.price = price;
            updateDestinationRoutePreview();
            updateDestinationSavingsBanner();
        }
 
        function updateDepartureDisplay(val) {
            const display = document.getElementById('departure-display');
            state.rideDetails.departure = val == 0 ? "Leaving now" : `In ${val} mins`;
            display.innerText = state.rideDetails.departure;
        }
 
        function initDestinationMap() {
            const loc = state.currentLocation;
            if (!state.destMapInstance) {
                state.destMapInstance = new mapboxgl.Map({
                    container: 'dest-real-map',
                    style: MAPBOX_STYLE_URL,
                    center: [loc.lng, loc.lat],
                    zoom: MAP_DEFAULT_ZOOM,
                    accessToken: mapboxToken,
                    antialias: true
                });
            } else {
                state.destMapInstance.resize();
            }
            state.destMapInstance.setCenter([loc.lng, loc.lat]);
            state.destMapInstance.setZoom(MAP_DEFAULT_ZOOM);
            
            // Clear previous markers
            if (state.destMarkers.length > 0) {
                state.destMarkers.forEach(m => m.remove());
                state.destMarkers = [];
            }
 
            const airportEl = document.createElement('div');
            airportEl.className = 'text-blue-600 drop-shadow-[0_10px_10px_rgba(59,130,246,0.4)] animate-bounce-pin';
            airportEl.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>';
            state.destMarkers.push(new mapboxgl.Marker({element: airportEl, anchor: 'bottom'})
                .setLngLat([loc.lng, loc.lat])
                .addTo(state.destMapInstance));
 
            if (state.role === 'passenger') {
                const offsets = [[0.015, 0.02], [-0.02, 0.01], [0.01, -0.03]];
                offsets.forEach(off => {
                    const driverEl = document.createElement('div');
                    driverEl.className = 'text-3xl drop-shadow-md';
                    driverEl.innerText = '🚕';
                    state.destMarkers.push(new mapboxgl.Marker({element: driverEl, anchor: 'center'})
                        .setLngLat([loc.lng + off[1], loc.lat + off[0]])
                        .addTo(state.destMapInstance));
                });
            }

            updateDestinationRoutePreview();
        }

        function clearDestinationRoutePreview() {
            if (!state.destMapInstance) return;
            if (state.destMapInstance.getLayer('dest-route')) {
                state.destMapInstance.removeLayer('dest-route');
            }
            if (state.destMapInstance.getSource('dest-route')) {
                state.destMapInstance.removeSource('dest-route');
            }
            state.destRouteSource = false;
        }

        function updateDestinationRoutePreview() {
            if (!state.destMapInstance || state.role !== 'passenger') return;

            const pickupName = document.getElementById('pickup-location').value || state.rideDetails.pickup;
            const pickup = pickupCoords[pickupName] || state.currentLocation;
            const destData = abujaDestinations.find(d => d.area === state.rideDetails.area);

            if (!destData) {
                clearDestinationRoutePreview();
                return;
            }

            const start = [pickup.lng, pickup.lat];
            const end = [destData.lng, destData.lat];

            const drawRoute = () => {
                fetch(`https://api.mapbox.com/directions/v5/mapbox/driving/${start[0]},${start[1]};${end[0]},${end[1]}?geometries=geojson&access_token=${mapboxToken}`)
                    .then(res => res.json())
                    .then(data => {
                        if (!data.routes || !data.routes[0] || !data.routes[0].geometry) return;
                        const routeGeo = data.routes[0].geometry;
                        const routeFeature = {
                            type: 'Feature',
                            properties: {},
                            geometry: routeGeo
                        };

                        if (state.destRouteSource && state.destMapInstance.getSource('dest-route')) {
                            state.destMapInstance.getSource('dest-route').setData(routeFeature);
                        } else {
                            clearDestinationRoutePreview();
                            state.destMapInstance.addSource('dest-route', {
                                type: 'geojson',
                                data: routeFeature
                            });
                            state.destMapInstance.addLayer({
                                id: 'dest-route',
                                type: 'line',
                                source: 'dest-route',
                                layout: { 'line-join': 'round', 'line-cap': 'round' },
                                paint: { 'line-color': '#2563eb', 'line-width': 5, 'line-opacity': 0.8 }
                            });
                            state.destRouteSource = true;
                        }

                        const coordinates = routeGeo.coordinates;
                        const bounds = coordinates.reduce((b, coord) => b.extend(coord), new mapboxgl.LngLatBounds(coordinates[0], coordinates[0]));
                        state.destMapInstance.fitBounds(bounds, { padding: 60, maxZoom: MAP_ROUTE_MAX_ZOOM });
                    })
                    .catch(err => console.warn('Destination route preview error:', err));
            };

            if (state.destMapInstance.isStyleLoaded()) {
                drawRoute();
            } else {
                state.destMapInstance.once('load', drawRoute);
            }
        }
 
        // --- FLOW TRANSITIONS --- //
        async function startSearching(triggerBtn = null) {
            const btn = triggerBtn || document.getElementById('btn-request');
            if (!beginActionLock('start_searching', btn, 'Processing...')) return;
            try {
                const destInput = document.getElementById('dest-search-input');
                if(!state.rideDetails.area || destInput.value.trim() === '') {
                    destInput.classList.add('input-error', 'animate-shake'); setTimeout(() => destInput.classList.remove('animate-shake'), 300);
                    endActionLock('start_searching', btn);
                    return;
                }

                state.rideDetails.pickup = document.getElementById('pickup-location').value;
                await refreshWalletFromBackend({ silent: true });

                if (!ensurePassengerWalletFunded(btn)) {
                    endActionLock('start_searching', btn);
                    return;
                }

                if (state.user) {
                    try {
                        await syncRecord('RideRequests', {
                            userId: state.user.id,
                            role: state.role,
                            pickup: state.rideDetails.pickup,
                            destination: state.rideDetails.area,
                            quotedFare: state.rideDetails.price,
                            seats: state.rideDetails.seats,
                            dropStyle: state.rideDetails.dropStyle,
                            status: 'requested'
                        }, 'append', '', '', true);
                    } catch (err) {
                        showSystemMessage('Could not save this ride request. Please check internet and try again.', 'Sync Failed', 'error', btn);
                        endActionLock('start_searching', btn);
                        return;
                    }
                }

                if(state.role === 'driver') {
                    state.rideDetails.seats = document.getElementById('driver-seats').value;
                    state.rideDetails.dropStyle = document.getElementById('driver-drop').value;
                    
                    // Automatically assign a random route request if the driver chose the flexible option
                    if (state.rideDetails.area === 'Anywhere in City') {
                        const randomDest = abujaDestinations[Math.floor(Math.random() * abujaDestinations.length)];
                        state.rideDetails.area = randomDest.area;
                        state.rideDetails.price = randomDest.price;
                    }
                }
    
                const trackingEmoji = document.getElementById('search-role-emoji');
                if(trackingEmoji) {
                    trackingEmoji.innerText = state.role === 'driver' ? '🚗' : '🧳';
                }
                
                if (state.role === 'driver') {
                    document.getElementById('search-heading').innerText = 'Online & Waiting...';
                    document.getElementById('search-subtext').innerHTML = '<i data-lucide="loader-2" class="animate-spin" width="18"></i> Listening for real passenger requests';
                    document.getElementById('search-savings-text').classList.add('hidden');
                } else {
                    document.getElementById('search-heading').innerText = 'Scanning Airport...';
                    document.getElementById('search-subtext').innerHTML = '<i data-lucide="loader-2" class="animate-spin" width="18"></i> Searching returning drivers close to you heading your destination';
                    const comparison = getFareComparison(state.rideDetails.price);
                    const searchSavingsText = document.getElementById('search-savings-text');
                    searchSavingsText.innerText = `You save ${formatNaira(comparison.savings)} vs regular ${formatNaira(comparison.regular)} fare`;
                    searchSavingsText.classList.remove('hidden');
                }
                lucide.createIcons();
    
                setStep('searching');
    
                setTimeout(async () => {
                    try {
                        if (state.role === 'driver') {
                            const requests = await loadOpenRideRequests({ silent: false });
                            if (!requests.length) {
                                showSystemMessage('No live passenger requests were found in the database yet.', 'No Requests Yet', 'info', btn);
                                setStep('destination');
                                endActionLock('start_searching', btn);
                                return;
                            }
                            const req = requests[0];
                            state.activeRideRequest = req;
                            state.rideDetails.pickup = req.pickup || state.rideDetails.pickup;
                            state.rideDetails.area = req.destination || state.rideDetails.area;
                            state.rideDetails.price = Number(req.quotedFare || state.rideDetails.price || 0);
                            state.rideDetails.seats = String(req.seats || 1);
                            state.rideDetails.dropStyle = req.dropStyle || state.rideDetails.dropStyle;
                            setupMatchedDriverScreen();
                            setStep('matched');
                        } else {
                            await loadMarketplaceDrivers({ silent: false });
                            renderMarketplace();
                            setStep('marketplace');
                        }
                    } finally {
                        endActionLock('start_searching', btn);
                    }
                }, 1200);
            } catch (err) {
                console.error('startSearching error', err);
                showSystemMessage('Something went wrong. Please try again.', 'Request Failed', 'error', btn);
                endActionLock('start_searching', btn);
            }
        }
 
        // --- MARKETPLACE FOR PASSENGERS --- //
        function applySort(type) {
            state.sortBy = type;
            renderMarketplace();
        }
 
        function renderMarketplace() {
            const filterContainer = document.getElementById('marketplace-filters');
            const marketSavingsBanner = document.getElementById('marketplace-savings-banner');
            const heading = document.querySelector('#screen-marketplace h1');
            const subtitle = document.querySelector('#screen-marketplace .text-slate-500.font-bold.text-xs.uppercase.tracking-wider');
            if (filterContainer) {
                const filters = [
                    { id: 'best', label: 'Best Match' },
                    { id: 'fare', label: 'Lowest Fare' },
                    { id: 'fastest', label: 'Fastest Departure' }
                ];
                filterContainer.innerHTML = filters.map(f => {
                    const isActive = state.sortBy === f.id;
                    const baseClass = "px-4 py-2 rounded-full text-xs whitespace-nowrap cursor-pointer transition-all border";
                    const activeClass = "bg-slate-800 text-white border-slate-800 shadow-md font-black";
                    const inactiveClass = "bg-white text-slate-600 border-slate-200 hover:bg-slate-50 font-bold";
                    return `<span onclick="applySort('${f.id}')" class="${baseClass} ${isActive ? activeClass : inactiveClass}">${f.label}</span>`;
                }).join('');
            }

            if (marketSavingsBanner && state.role === 'passenger' && state.rideDetails.price) {
                const comparison = getFareComparison(state.rideDetails.price);
                marketSavingsBanner.innerHTML = `
                    <p class="text-[10px] font-black uppercase text-green-700">Trusted by frequent airport riders</p>
                    <p class="text-sm font-black text-green-600">Regular: ${formatNaira(comparison.regular)} • Poolily: ${formatNaira(comparison.aero)} • Save: ${formatNaira(comparison.savings)}</p>
                `;
                marketSavingsBanner.classList.remove('hidden');
            }
 
            let sortedDrivers = state.marketplaceDrivers.map((driver, index) => deriveDriverMarketplaceData(driver, index));
            if (state.sortBy === 'fare') {
                sortedDrivers.sort((a, b) => a.price - b.price);
            } else if (state.sortBy === 'fastest') {
                sortedDrivers.sort((a, b) => a.departureMins - b.departureMins);
            } else {
                sortedDrivers.sort((a, b) => b.match - a.match);
            }
            state.marketplaceDisplayDrivers = sortedDrivers;

            if (heading) heading.innerText = `${sortedDrivers.length} Driver${sortedDrivers.length === 1 ? '' : 's'} found`;
            if (subtitle) subtitle.innerText = sortedDrivers.length ? 'pick one to save money' : 'No eligible drivers found in your database yet';
 
            const list = document.getElementById('marketplace-list');
            if (!sortedDrivers.length) {
                list.innerHTML = `
                    <div class="bg-white rounded-[2rem] p-6 shadow-[0_8px_20px_rgba(0,0,0,0.06)] border border-slate-100 text-center">
                        <h3 class="text-lg font-black text-slate-800">No drivers available yet</h3>
                        <p class="text-sm font-bold text-slate-500 mt-2">Seed the database with driver users or have one sign in and go online.</p>
                    </div>
                `;
                return;
            }
            list.innerHTML = sortedDrivers.map(d => {
                const comparison = getFareComparison(d.price);
                return `
                <div class="bg-white rounded-[2rem] p-5 shadow-[0_8px_20px_rgba(0,0,0,0.06)] border border-slate-100">
                    <div class="flex justify-between items-start mb-3">
                        <div class="flex items-center gap-3">
                            ${buildAvatarMarkup(d, 'w-12 h-12', 'text-base')}
                            <div>
                                <h3 class="font-black text-slate-800 leading-tight">${d.name}</h3>
                                <p class="text-[11px] font-bold text-slate-500">${d.car} • ${d.plate}</p>
                            </div>
                        </div>
                        <div class="text-right">
                            <span class="font-black text-xl text-slate-800">₦${d.price.toLocaleString()}</span>
                            <br><span class="text-[10px] text-green-600 font-bold bg-green-50 px-2 py-0.5 rounded-full">Save ${formatNaira(comparison.savings)}</span>
                        </div>
                    </div>
                    
                    <div class="grid grid-cols-3 gap-2 mb-3 bg-[#f8fafc] p-2 rounded-xl border border-slate-100">
                        <div class="text-center"><p class="text-[10px] text-slate-400 font-bold uppercase">ETA</p><p class="text-xs font-black text-slate-700">${d.eta}</p></div>
                        <div class="text-center border-l border-r border-slate-200"><p class="text-[10px] text-slate-400 font-bold uppercase">Seats</p><p class="text-xs font-black text-slate-700">${d.seats}</p></div>
                        <div class="text-center"><p class="text-[10px] text-slate-400 font-bold uppercase">Style</p><p class="text-xs font-black text-slate-700">${d.drop}</p></div>
                    </div>
                    
                    <div class="flex flex-wrap gap-1 mb-4">
                        <span class="bg-yellow-100 text-yellow-700 text-[10px] px-2 py-0.5 rounded-full font-bold flex items-center gap-0.5"><i data-lucide="star" width="10" fill="currentColor"></i> ${d.rating}</span>
                        ${d.badges.map(b => `<span class="bg-blue-50 text-blue-600 text-[10px] px-2 py-0.5 rounded-full font-bold">${b}</span>`).join('')}
                    </div>
 
                    <div class="bg-slate-50 p-2 rounded-lg mb-4 border border-slate-100">
                        <p class="text-[10px] font-bold text-slate-600 truncate"><span class="text-blue-500">${d.departure}</span></p>
                        <p class="text-[10px] font-bold text-slate-500 truncate">From ${state.rideDetails.pickup} • To ${state.rideDetails.area}</p>
                    </div>
                    
                    <div class="flex items-center justify-between">
                        <span class="text-xs font-black text-green-500 flex items-center gap-1">
                            <i data-lucide="check-circle-2" width="14"></i> ${d.match}% fit
                        </span>
                        <button onclick='chooseDriver(${JSON.stringify(String(d.id))}, this)' class="btn-primary-3d !py-2 !px-6 !rounded-xl !text-sm !w-auto">
                            Choose & Save ${formatNaira(comparison.savings)}
                        </button>
                    </div>
                </div>
            `}).join('');
            lucide.createIcons();
        }
 
        function chooseDriver(id, triggerBtn = null) {
            const btn = triggerBtn || document.activeElement;
            if (!beginActionLock(`choose_driver_${id}`, btn, 'Matching...')) return;
            const driver = (state.marketplaceDisplayDrivers || []).find((d) => String(d.id) === String(id));
            state.selectedDriver = driver || null;
            if (!state.selectedDriver) {
                endActionLock(`choose_driver_${id}`, btn);
                return;
            }
            const comparison = getFareComparison(state.selectedDriver.price);
            
            const container = document.getElementById('matched-card-container');
            container.innerHTML = `
                <div class="flex flex-col items-center justify-center py-10 px-4 text-center bg-white/90 backdrop-blur-sm rounded-[2rem] border border-white">
                    <div class="w-16 h-16 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin mb-6"></div>
                    <h3 class="text-2xl font-black text-slate-800 tracking-tight mb-2">Waiting for ${state.selectedDriver.name}</h3>
                    <p class="text-sm font-bold text-slate-500">Contacting driver to confirm your ride request...</p>
                    <p class="text-xs font-black text-green-600 mt-3 bg-green-50 border border-green-200 rounded-full px-4 py-2">Locked fare: ${formatNaira(comparison.aero)} • Saving ${formatNaira(comparison.savings)} vs regular fare</p>
                </div>
            `;
            
            initMatchMap(false);
            setStep('matched');
 
            setTimeout(() => {
                if (state.step === 'matched' && state.role === 'passenger') {
                    setupMatchedPassengerScreen();
                }
                endActionLock(`choose_driver_${id}`, btn);
            }, 3000);
        }
 
        // --- LIVE PRE-RIDE MAP --- //
        function initMatchMap(startApproach = false) {
            const pLoc = state.currentLocation;
            let dLoc = { lat: pLoc.lat - 0.015, lng: pLoc.lng - 0.015 };
            
            if (!state.matchMapInstance) {
                state.matchMapInstance = new mapboxgl.Map({
                    container: 'matched-real-map',
                    style: MAPBOX_STYLE_URL,
                    center: [pLoc.lng, pLoc.lat],
                    zoom: MAP_DEFAULT_ZOOM,
                    accessToken: mapboxToken,
                    antialias: true
                });
            } else {
                state.matchMapInstance.resize();
            }
            
            // Clear markers
            if (state.matchPassengerMarker) state.matchPassengerMarker.remove();
            if (state.matchDriverMarker) state.matchDriverMarker.remove();
            
            const pEl = document.createElement('div');
            pEl.className = 'text-3xl drop-shadow-md';
            pEl.innerText = '🧍';
            state.matchPassengerMarker = new mapboxgl.Marker({element: pEl, anchor: 'center'})
                .setLngLat([pLoc.lng, pLoc.lat])
                .addTo(state.matchMapInstance);
 
            const dEl = document.createElement('div');
            dEl.className = 'text-3xl drop-shadow-md';
            dEl.innerText = '🚗';
            state.matchDriverMarker = new mapboxgl.Marker({element: dEl, anchor: 'center'})
                .setLngLat([dLoc.lng, dLoc.lat])
                .addTo(state.matchMapInstance);
            
            state.driverDistance = 100;
            
            if(state.approachInterval) clearInterval(state.approachInterval);
            if (startApproach) {
                state.approachInterval = setInterval(() => {
                    dLoc.lat += (pLoc.lat - dLoc.lat) * 0.15;
                    dLoc.lng += (pLoc.lng - dLoc.lng) * 0.15;
                    state.matchDriverMarker.setLngLat([dLoc.lng, dLoc.lat]);
                    
                    state.driverDistance -= 5;
                    const startBtn = document.getElementById('btn-start-ride');
                    const waitingText = document.getElementById('waiting-text');
                    const distancePill = document.getElementById('driver-distance-pill');

                    if (distancePill) {
                        const dist = Math.max(0, state.driverDistance);
                        distancePill.innerText = dist <= 20 ? 'Passenger reached' : `${dist}m away`;
                        if (dist <= 20) {
                            distancePill.className = 'text-[10px] font-black px-2 py-1 rounded-full bg-green-100 text-green-700';
                        }
                    }
                    
                    if(startBtn && state.driverDistance <= 20) {
                        startBtn.disabled = false;
                        if(waitingText) {
                            waitingText.innerText = state.role === 'driver' ? "Passenger reached!" : "Driver has arrived!";
                            waitingText.classList.remove('animate-pulse');
                            waitingText.classList.add('text-green-600');
                        }
                    }
                }, 1000);
            } else {
                state.approachInterval = null;
            }
            
            const sw = [Math.min(pLoc.lng, dLoc.lng), Math.min(pLoc.lat, dLoc.lat)];
            const ne = [Math.max(pLoc.lng, dLoc.lng), Math.max(pLoc.lat, dLoc.lat)];
            state.matchMapInstance.fitBounds([sw, ne], { padding: 50 });
        }
 
 
        // --- COMPACT DRIVER REQUEST UI & MATCHED SCREEN --- //
        function setupMatchedDriverScreen() {
            initMatchMap(false);
            const container = document.getElementById('matched-card-container');
            container.className = 'glass-panel p-6 w-full';
            const request = state.activeRideRequest;
            const rider = request && request.rider ? request.rider : { name: 'Passenger', phone: '', profilePhoto: null };
            const passengerChecks = [
                { label: 'Phone verified', passed: true },
                { label: 'ID verified', passed: true },
                { label: 'Photo verified', passed: !!state.rideDetails.passengerPhoto }
            ];
            const passedCount = passengerChecks.filter(c => c.passed).length;
            const scorePct = Math.round((passedCount / passengerChecks.length) * 100);
            const checksHtml = passengerChecks.map(check => `
                <span class="text-[10px] font-black px-2 py-1 rounded-full ${check.passed ? 'bg-green-100 text-green-700 border border-green-200' : 'bg-red-100 text-red-700 border border-red-200'}">
                    ${check.label.replace(' verified', '')}: ${check.passed ? 'OK' : 'X'}
                </span>
            `).join('');
            
            container.innerHTML = `
                <div class="bg-white rounded-[2rem] p-5 shadow-xl border border-slate-100 mb-6 relative overflow-hidden">
                    <h3 class="text-sm uppercase tracking-widest text-blue-600 font-black mb-4 flex items-center gap-1 justify-center w-full">
                        <i data-lucide="bell-ring" width="16" class="animate-bounce"></i> New Request
                    </h3>
                
                    <div class="absolute top-0 right-0 w-20 h-20 bg-blue-500/10 rounded-full blur-xl"></div>
                    
                    <div class="flex items-center gap-4 mb-4">
                        ${buildAvatarMarkup(rider, 'w-16 h-16', 'text-lg')}
                        <div>
                            <h4 class="font-black text-slate-800 text-xl">${rider.name}</h4>
                        <div class="flex items-center text-xs text-slate-500 font-bold gap-1 mt-0.5">
                                <i data-lucide="badge-check" class="text-green-500" width="12"></i> Verified rider
                            </div>
                        </div>
                        <div class="ml-auto text-right">
                            <span class="font-black text-2xl text-green-500 block">₦${state.rideDetails.price.toLocaleString()}</span>
                        </div>
                    </div>
 
                    <div class="bg-slate-50 p-3 rounded-xl border border-slate-100 space-y-2 relative z-10">
                        <div class="flex items-start gap-2">
                            <div class="mt-0.5"><i data-lucide="map-pin" class="text-blue-500" width="14"></i></div>
                            <div>
                                <p class="text-[10px] uppercase font-bold text-slate-400 leading-tight">Pickup</p>
                                <p class="text-xs font-black text-slate-700">${state.rideDetails.pickup}</p>
                            </div>
                        </div>
                        <div class="w-0.5 h-3 bg-slate-200 ml-[6px]"></div>
                        <div class="flex items-start gap-2">
                            <div class="mt-0.5 text-red-500"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg></div>
                            <div>
                                <p class="text-[10px] uppercase font-bold text-slate-400 leading-tight">Heading to</p>
                                <p class="text-xs font-black text-slate-700">${state.rideDetails.area}</p>
                                <p class="text-[10px] font-bold text-blue-500 mt-0.5">Requested: ${request && request.dropStyle ? request.dropStyle : 'Door drop'}</p>
                            </div>
                        </div>
                    </div>
                    <div class="mt-3 bg-green-50 border border-green-200 rounded-xl px-3 py-2">
                        <p class="text-xs font-black text-green-600">You were supposed to go back empty... This Passenger will pay you N${state.rideDetails.price.toLocaleString()} fare when you accept.</p>
                    </div>

                    <div class="mt-3 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2">
                        <div class="flex items-center justify-between gap-2 mb-2">
                            <p class="text-[10px] font-black uppercase tracking-wider text-slate-500">Passenger Verification</p>
                            <p class="text-[10px] font-black ${scorePct >= 80 ? 'text-green-600' : 'text-red-600'}">${passedCount}/${passengerChecks.length} • ${scorePct}%</p>
                        </div>
                        <div class="flex flex-wrap gap-1.5">${checksHtml}</div>
                    </div>
                </div>
 
                <div class="flex flex-col gap-4 w-full" id="driver-match-actions">
                    <p class="text-center text-sm font-bold text-slate-500">Review request details...</p>
                    <div class="flex gap-4">
                        <button onclick="rejectRide(this)" class="w-1/3 btn-danger-3d !bg-slate-100 !text-red-500 !border-slate-200">Reject</button>
                        <button onclick="acceptTrip(this)" class="flex-1 btn-primary-3d">Accept Trip</button>
                    </div>
                </div>
            `;
            lucide.createIcons();
        }
 
        function acceptTrip(triggerBtn = null) {
            const btn = triggerBtn || document.activeElement;
            if (!beginActionLock('accept_trip', btn, 'Accepting...')) return;
            const container = document.getElementById('matched-card-container');
            const request = state.activeRideRequest;
            const rider = request && request.rider ? request.rider : { name: 'Passenger', phone: '', profilePhoto: null };
            container.className = 'glass-panel p-3.5 w-[90%] max-w-[330px] ml-auto';
            container.innerHTML = `
                <div class="bg-white rounded-2xl p-3.5 shadow-xl border border-slate-100 relative overflow-hidden">
                    <div class="flex items-center gap-3">
                        ${buildAvatarMarkup(rider, 'w-10 h-10', 'text-sm')}
                        <div class="min-w-0">
                            <p class="text-[11px] uppercase font-black tracking-wider text-blue-600">Accepted Request</p>
                            <p class="text-sm font-black text-slate-800 truncate">${rider.name} • To ${state.rideDetails.area}</p>
                        </div>
                        <span class="ml-auto text-sm font-black text-green-600 shrink-0">₦${state.rideDetails.price.toLocaleString()}</span>
                    </div>
                    <div class="mt-2.5 flex items-center justify-between gap-2">
                        <p id="waiting-text" class="text-[11px] font-black text-slate-600 animate-pulse">Driving to passenger...</p>
                        <span id="driver-distance-pill" class="text-[10px] font-black px-2 py-1 rounded-full bg-blue-100 text-blue-700">100m away</span>
                    </div>
                    <button id="btn-start-ride" onclick="startTracking(this)" class="btn-primary-3d w-full !py-3 mt-2.5" disabled>Start Ride</button>
                </div>
            `;
            initMatchMap(true);
            lucide.createIcons();
            endActionLock('accept_trip', btn);
        }
 
        function setupMatchedPassengerScreen() {
            const container = document.getElementById('matched-card-container');
            const d = state.selectedDriver;
            const comparison = getFareComparison(d.price);
            
            container.innerHTML = `
                <div class="bg-white rounded-[2rem] p-5 shadow-xl border border-slate-100 mb-6">
                    <h3 class="text-sm uppercase tracking-widest text-green-600 font-black mb-4 flex items-center gap-1 justify-center">
                        <i data-lucide="check-circle" width="16"></i> Driver Confirmed
                    </h3>
 
                    <div class="flex items-center gap-4 mb-6 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                        ${buildAvatarMarkup(d, 'w-14 h-14', 'text-base')}
                        <div class="flex-1">
                            <h4 class="font-black text-slate-800 text-lg">${d.name}</h4>
                            <p class="text-xs font-bold text-slate-500">${d.car} • <span class="uppercase font-black">${d.plate}</span></p>
                        </div>
                        <div class="flex gap-2 shrink-0">
                            <a href="tel:${d.phone}" class="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center active:scale-95 transition-transform">
                                <i data-lucide="phone" width="16"></i>
                            </a>
                        </div>
                    </div>
 
                    <div class="flex justify-between items-center mb-2">
                        <div>
                            <p class="text-[10px] uppercase font-bold text-slate-400">Heading to</p>
                            <p class="text-sm font-black text-slate-800">${state.rideDetails.area}</p>
                        </div>
                        <div class="text-right">
                            <p class="text-[10px] uppercase font-bold text-slate-400">Total Fare</p>
                            <p class="text-lg font-black text-slate-800">₦${d.price.toLocaleString()}</p>
                        </div>
                    </div>
                    <div class="bg-green-50 border border-green-200 rounded-xl px-3 py-2 mt-3">
                        <p class="text-[10px] font-black uppercase text-green-700">Savings Locked In</p>
                        <p class="text-xs font-black text-green-600">Regular fare: ${formatNaira(comparison.regular)} • You pay: ${formatNaira(comparison.aero)} • Save: ${formatNaira(comparison.savings)}</p>
                    </div>
                </div>
 
                <div class="flex flex-col gap-4">
                    <p id="waiting-text" class="text-center text-sm font-bold text-slate-500 animate-pulse">Waiting for driver to arrive...</p>
                    <button id="btn-start-ride" onclick="startTracking(this)" class="btn-primary-3d w-full" disabled>Start Ride</button>
                </div>
            `;
            initMatchMap(true);
            lucide.createIcons();
        }
        
        function rejectRide(triggerBtn = null) {
            const btn = triggerBtn || document.activeElement;
            if (!beginActionLock('reject_ride', btn, 'Rejecting...')) return;
            setStep('searching');
            document.getElementById('search-heading').innerText = 'Online & Waiting...';
            document.getElementById('search-subtext').innerHTML = '<i data-lucide="loader-2" class="animate-spin" width="18"></i> Listening for next passenger';
            lucide.createIcons();
 
            setTimeout(async () => {
                try {
                    if (state.step === 'searching' && state.role === 'driver') {
                        const requests = await loadOpenRideRequests({ silent: true });
                        if (requests.length) {
                            setupMatchedDriverScreen();
                            setStep('matched');
                        } else {
                            setStep('destination');
                        }
                    }
                } finally {
                    endActionLock('reject_ride', btn);
                }
            }, 1200);
        }
 
        // --- IN-RIDE TRACKING SCREEN --- //
        function startTracking(triggerBtn = null) {
            const btn = triggerBtn || document.getElementById('btn-start-ride');
            if (!beginActionLock('start_tracking', btn, 'Starting...')) return;
            state.hasReachedDestination = false;
            state.tripStartedAt = Date.now();
            state.cancellationReason = '';
            
            const trackAvatar = document.getElementById('track-avatar');
            const trackName = document.getElementById('track-user-name');
            const trackVerification = document.getElementById('track-user-verification');
            
            if (state.role === 'driver') {
                const rider = state.activeRideRequest && state.activeRideRequest.rider ? state.activeRideRequest.rider : { name: 'Passenger', profilePhoto: null };
                trackAvatar.innerHTML = buildAvatarMarkup(rider, 'w-full h-full', 'text-lg').replace('rounded-full', 'rounded-full').replace(' shadow-sm', '');
                trackName.innerText = rider.name;
                if (trackVerification) trackVerification.innerText = getPassengerVerificationText();
            } else {
                trackAvatar.innerHTML = state.selectedDriver ? buildAvatarMarkup(state.selectedDriver, 'w-full h-full', 'text-lg').replace('rounded-full', 'rounded-full').replace(' shadow-sm', '') : '👨';
                trackName.innerText = state.selectedDriver ? state.selectedDriver.name : 'Driver';
                if (trackVerification) trackVerification.innerText = getDriverVerificationText();
            }
 
            document.getElementById('tracking-status-title').innerText = "Approaching destination";
            if (state.role === 'passenger') {
                const trackedPrice = state.selectedDriver ? state.selectedDriver.price : state.rideDetails.price;
                const comparison = getFareComparison(trackedPrice);
                document.getElementById('tracking-subtext').innerText = `Arriving at ${state.rideDetails.area} • Saved ${formatNaira(comparison.savings)}`;
            } else {
                document.getElementById('tracking-subtext').innerText = `Arriving at ${state.rideDetails.area}`;
            }
            
            setTimeout(() => {
                if (!("geolocation" in navigator)) {
                    showSystemMessage('GPS is not available on this device/browser.', 'Location Unavailable', 'error', btn);
                    endActionLock('start_tracking', btn);
                    return;
                }

                navigator.geolocation.getCurrentPosition((pos) => {
                    state.currentLocation = { lat: pos.coords.latitude, lng: pos.coords.longitude };
                    setStep('tracking');
                    initOrUpdateTrackingMap(state.currentLocation);

                    if (state.watchId) {
                        navigator.geolocation.clearWatch(state.watchId);
                        state.watchId = null;
                    }

                    try {
                        state.watchId = navigator.geolocation.watchPosition(
                            (position) => {
                                state.currentLocation = { lat: position.coords.latitude, lng: position.coords.longitude };
                                initOrUpdateTrackingMap(state.currentLocation);
                            },
                            () => showSystemMessage('Live GPS tracking was interrupted. Check location permission and signal strength.', 'Tracking Paused', 'error', btn),
                            { enableHighAccuracy: true, maximumAge: 3000, timeout: 20000 }
                        );
                    } catch (err) {
                        showSystemMessage('Could not start live GPS tracking.', 'Tracking Error', 'error', btn);
                    }
                    endActionLock('start_tracking', btn);
                }, () => {
                    showSystemMessage('Unable to get your current GPS position. Please enable precise location and try again.', 'GPS Error', 'error', btn);
                    endActionLock('start_tracking', btn);
                }, { enableHighAccuracy: true, maximumAge: 0, timeout: 20000 });
            }, 300);
        }

        function getDistanceMeters(from, to) {
            if (!from || !to) return Number.POSITIVE_INFINITY;
            const toRad = (deg) => deg * (Math.PI / 180);
            const earthRadius = 6371000;
            const dLat = toRad(to.lat - from.lat);
            const dLng = toRad(to.lng - from.lng);
            const lat1 = toRad(from.lat);
            const lat2 = toRad(to.lat);
            const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
            return 2 * earthRadius * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        }
 
        function initOrUpdateTrackingMap(loc) {
            const destData = abujaDestinations.find(d => d.area === state.rideDetails.area);
            const destLoc = destData ? [destData.lng, destData.lat] : [loc.lng, loc.lat];
            const destPoint = destData ? { lat: destData.lat, lng: destData.lng } : { lat: loc.lat, lng: loc.lng };
            const distanceToDestination = getDistanceMeters(loc, destPoint);
            const reachedNow = distanceToDestination <= TRACKING_ARRIVAL_RADIUS_METERS;

            if (reachedNow && !state.hasReachedDestination) {
                state.hasReachedDestination = true;
                const titleEl = document.getElementById('tracking-status-title');
                const subtextEl = document.getElementById('tracking-subtext');
                if (titleEl) titleEl.innerText = 'Arrived at destination';
                if (subtextEl) subtextEl.innerText = `At ${state.rideDetails.area}`;
            }
 
            if (!state.trackMapInstance) {
                state.trackMapInstance = new mapboxgl.Map({
                    container: 'real-map-container',
                    style: MAPBOX_STYLE_URL,
                    center: [loc.lng, loc.lat],
                    zoom: MAP_DEFAULT_ZOOM,
                    accessToken: mapboxToken,
                    antialias: true
                });
                state.trackMapLoaded = false;
 
                const trackEl = document.createElement('div');
                trackEl.innerHTML = `<div class="w-8 h-8 bg-blue-500 rounded-full border-4 border-white shadow-[0_4px_10px_rgba(0,0,0,0.3)] flex items-center justify-center text-white"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg></div>`;
                state.trackMarkerInstance = new mapboxgl.Marker({element: trackEl, anchor: 'bottom'})
                    .setLngLat([loc.lng, loc.lat])
                    .addTo(state.trackMapInstance);
 
                const destEl = document.createElement('div');
                destEl.className = 'text-red-500 drop-shadow-[0_10px_10px_rgba(239,68,68,0.4)]';
                destEl.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>';
                new mapboxgl.Marker({element: destEl, anchor: 'bottom'})
                    .setLngLat(destLoc)
                    .addTo(state.trackMapInstance);
 
                state.trackMapInstance.once('load', () => {
                    state.trackMapLoaded = true;
                    fetchRoute([loc.lng, loc.lat], destLoc);
                });
 
            } else {
                state.trackMapInstance.resize();
                state.trackMarkerInstance.setLngLat([loc.lng, loc.lat]);
                state.trackMapInstance.easeTo({
                    center: [loc.lng, loc.lat],
                    duration: 800,
                    zoom: Math.max(MAP_DEFAULT_ZOOM, 15.2),
                    essential: true
                });
                if (state.trackMapLoaded || state.trackMapInstance.isStyleLoaded()) {
                    state.trackMapLoaded = true;
                    fetchRoute([loc.lng, loc.lat], destLoc);
                }
            }
        }
 
        function fetchRoute(start, end) {
            fetch(`https://api.mapbox.com/directions/v5/mapbox/driving/${start[0]},${start[1]};${end[0]},${end[1]}?geometries=geojson&access_token=${mapboxToken}`)
                .then(res => res.json())
                .then(data => {
                    if (!data.routes || !data.routes[0] || !data.routes[0].geometry) return;
                    const routeGeo = data.routes[0].geometry;
 
                    if (state.trackRouteSource) {
                        state.trackMapInstance.getSource('route').setData({
                            type: 'Feature',
                            properties: {},
                            geometry: routeGeo
                        });
                    } else {
                        state.trackMapInstance.addSource('route', {
                            type: 'geojson',
                            data: {
                                type: 'Feature',
                                properties: {},
                                geometry: routeGeo
                            }
                        });
                        state.trackMapInstance.addLayer({
                            id: 'route',
                            type: 'line',
                            source: 'route',
                            layout: { 'line-join': 'round', 'line-cap': 'round' },
                            paint: { 'line-color': '#2563eb', 'line-width': 6, 'line-opacity': 0.9 }
                        });
                        state.trackRouteSource = true;
                    }
 
                    // Fit bounds
                    const coordinates = routeGeo.coordinates;
                    const bounds = coordinates.reduce((bounds, coord) => {
                        return bounds.extend(coord);
                    }, new mapboxgl.LngLatBounds(coordinates[0], coordinates[0]));
                    state.trackMapInstance.fitBounds(bounds, { padding: 50, maxZoom: MAP_ROUTE_MAX_ZOOM });
                })
                .catch(err => console.error('Routing error:', err));
        }
        
        function shareRideDetails() {
            let message = "";
            if (state.role === 'passenger' && state.selectedDriver) {
                const d = state.selectedDriver;
                message = `I'm on my way to ${state.rideDetails.area} via Poolily! \n\nDriver: ${d.name}\nVehicle: ${d.car} (${d.plate})`;
            } else if (state.role === 'driver') {
                const fare = state.rideDetails && state.rideDetails.price ? `₦${Number(state.rideDetails.price).toLocaleString()}` : 'pending fare';
                const verificationText = getPassengerVerificationText();
                message = `I accepted a ride to ${state.rideDetails.area} on Poolily.\n\nPassenger status: ${verificationText}\nFare: ${fare}`;
            }
            
            if(message) {
                const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
                window.open(whatsappUrl, '_blank');
            }
        }

        function getPassengerVerificationSummary() {
            const checks = [
                { key: 'Phone', passed: true },
                { key: 'ID', passed: true },
                { key: 'GPS', passed: !!(state.currentLocation && Number.isFinite(state.currentLocation.lat) && Number.isFinite(state.currentLocation.lng)) },
                { key: 'Amount', passed: Number(state.rideDetails.price) > 0 },
                { key: 'Photo', passed: !!state.rideDetails.passengerPhoto }
            ];
            const score = checks.filter(c => c.passed).length;
            return { checks, score, total: checks.length };
        }

        function getPassengerVerificationText() {
            const summary = getPassengerVerificationSummary();
            return summary.score > 0 ? `Verified User • ${summary.score}/${summary.total}` : 'Unverified';
        }

        function getDriverVerificationText() {
            if (!state.selectedDriver) return 'Unverified';
            const badgeText = (state.selectedDriver.badges || []).join(' ').toLowerCase();
            const checks = [
                badgeText.includes('phone verified'),
                badgeText.includes('id verified'),
                badgeText.includes('plate'),
                Number(state.selectedDriver.rating || 0) >= 4.5,
                !!state.selectedDriver.phone
            ];
            const score = checks.filter(Boolean).length;
            return score > 0 ? `Verified User • ${score}/5` : 'Unverified';
        }

        async function finalizeTrip(status = 'completed', reason = '') {
            const price = state.role === 'passenger'
                ? Number((state.selectedDriver && state.selectedDriver.price) || state.rideDetails.price || 0)
                : Number(state.rideDetails.price || 0);
            const dest = state.rideDetails.area || 'Destination';
            const isCancelled = status === 'cancelled';

            if (state.user && state.user.wallet) {
                if (!isCancelled) {
                    if (state.role === 'passenger') {
                        state.user.wallet.balance -= price;
                        state.user.wallet.history.unshift({
                            desc: `Ride to ${dest}`,
                            amount: `-₦${price.toLocaleString()}`,
                            date: "Just now",
                            type: "debit"
                        });
                    } else if (state.role === 'driver') {
                        state.user.wallet.balance += price;
                        state.user.wallet.history.unshift({
                            desc: `Ride to ${dest}`,
                            amount: `+₦${price.toLocaleString()}`,
                            date: "Just now",
                            type: "credit"
                        });
                    }
                } else {
                    state.user.wallet.history.unshift({
                        desc: `Trip to ${dest} cancelled`,
                        amount: `₦0`,
                        date: "Just now",
                        type: "neutral"
                    });
                }
            }

            state.rideHistory.unshift({
                role: state.role,
                dest,
                pickup: state.rideDetails.pickup,
                price,
                status: isCancelled ? 'cancelled' : 'completed',
                tripEndedAt: new Date().toISOString()
            });

            if (state.user) {
                persistUserSession();
                try {
                    await syncRecord('Rides', {
                        userId: state.user.id,
                        role: state.role,
                        destination: dest,
                        pickup: state.rideDetails.pickup,
                        price,
                        status,
                        cancelledBy: isCancelled ? state.role : '',
                        cancellationReason: isCancelled ? reason : '',
                        reachedDestination: state.hasReachedDestination,
                        tripStartedAt: state.tripStartedAt ? new Date(state.tripStartedAt).toISOString() : '',
                        tripEndedAt: new Date().toISOString()
                    }, 'append', '', '', true);

                    if (!isCancelled) {
                        await syncRecord('WalletTransactions', {
                            userId: state.user.id,
                            role: state.role,
                            type: state.role === 'passenger' ? 'debit' : 'credit',
                            amount: price,
                            description: `Ride to ${dest}`,
                            balanceAfter: state.user.wallet.balance
                        }, 'append', '', '', true);
                    }

                    await syncRecord('Users', {
                        userId: state.user.id,
                        walletBalance: state.user.wallet.balance,
                        walletHistory: state.user.wallet.history
                    }, 'upsert', 'userId', state.user.id, true);
                } catch (err) {
                    showSystemMessage('Trip state could not be fully synced. Please check network and retry.', 'Sync Failed', 'error');
                    return;
                }
            }

            state.selectedDriver = null;
            state.rideDetails = { pickup: 'International Arrival', area: '', price: 0, seats: '1', departure: 'Leaving now', dropStyle: 'Hub drop', passengerPhoto: null };
            state.hasReachedDestination = false;
            state.tripStartedAt = null;
            state.cancellationReason = '';
            document.getElementById('dest-search-input').value = '';
            
            if (state.trackMapInstance) {
                state.trackMapInstance.remove();
                state.trackMapInstance = null;
                state.trackRouteSource = false;
                state.trackMapLoaded = false;
            }
 
            renderHistory();
            renderProfile();
            if (isCancelled) {
                showSystemMessage(`Trip cancelled: ${reason}`, 'Trip Cancelled', 'info');
            }
            
            setStep('idle', 'home');
        }

        async function endTrip(triggerBtn = null) {
            const btn = triggerBtn || document.activeElement;
            if (!beginActionLock('end_trip', btn, 'Processing...')) return;
            if (!state.hasReachedDestination) {
                openCancelTripModal();
                endActionLock('end_trip', btn);
                return;
            }
            try {
                await finalizeTrip('completed', '');
            } finally {
                endActionLock('end_trip', btn);
            }
        }
 
        function renderHistory() {
            // 1. Render Rides List
            const rideItems = Array.isArray(state.rideHistory) ? state.rideHistory : [];
            document.getElementById('history-list').innerHTML = rideItems.length ? rideItems.map(ride => `
                <div class="bg-white rounded-[1.5rem] p-5 shadow-sm border border-slate-100">
                    <div class="flex justify-between items-start mb-3">
                        <div class="flex items-center gap-2 text-xs font-bold text-slate-500">
                            <i data-lucide="clock" width="14"></i> ${formatRideHistoryDate(ride.tripEndedAt)}
                        </div>
                        <span class="text-[10px] font-black uppercase px-3 py-1 rounded-full ${String(ride.status).toLowerCase() === 'cancelled' ? 'bg-red-50 text-red-600 border border-red-100' : 'bg-green-50 text-green-600 border border-green-100'}">${String(ride.status || 'completed')}</span>
                    </div>
                    <div class="flex items-center gap-4">
                        <div class="w-12 h-12 rounded-xl bg-slate-50 flex items-center justify-center text-2xl border border-slate-100">${ride.role === 'driver' ? '🚗' : '🧳'}</div>
                        <div class="flex-1">
                            <h3 class="font-black text-slate-800 text-lg">${ride.dest}</h3>
                            <p class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">From ${ride.pickup || 'Airport'}</p>
                        </div>
                        <div class="font-black text-xl text-slate-700">${formatNaira(ride.price || 0)}</div>
                    </div>
                </div>
            `).join('') : `
                <div class="bg-white rounded-[1.5rem] p-5 shadow-sm border border-slate-100 text-center">
                    <h3 class="font-black text-slate-800 text-lg">No rides yet</h3>
                    <p class="text-sm font-bold text-slate-500 mt-2">Completed trips will appear here.</p>
                </div>
            `;
 
            // 2. Render Full Transaction List
            const txList = (state.user && state.user.wallet && state.user.wallet.history) ? state.user.wallet.history : [];
            if (txList.length > 0) {
                document.getElementById('transaction-list').innerHTML = txList.map(tx => `
                    <div class="bg-white rounded-[1.5rem] p-5 shadow-sm border border-slate-100 flex justify-between items-center">
                        <div class="flex items-center gap-4">
                            <div class="w-12 h-12 rounded-xl ${tx.type==='credit'?'bg-green-50 text-green-500':(tx.type==='neutral'?'bg-slate-100 text-slate-500':'bg-red-50 text-red-500')} flex items-center justify-center text-xl border ${tx.type==='credit'?'border-green-100':(tx.type==='neutral'?'border-slate-200':'border-red-100')}">
                                <i data-lucide="${tx.type==='credit'?'arrow-down-left':(tx.type==='neutral'?'minus':'arrow-up-right')}" width="20"></i>
                            </div>
                            <div>
                                <h3 class="font-black text-slate-800 text-base">${tx.desc}</h3>
                                <p class="text-[10px] font-bold text-slate-400 mt-0.5">${tx.date}</p>
                            </div>
                        </div>
                        <div class="font-black text-lg ${tx.type==='credit'?'text-green-500':(tx.type==='neutral'?'text-slate-500':'text-slate-700')}">${tx.amount}</div>
                    </div>
                `).join('');
            } else {
                document.getElementById('transaction-list').innerHTML = `<p class="text-sm font-bold text-slate-400 text-center py-10">No recent transactions</p>`;
            }
 
            lucide.createIcons();
        }
 
        // Infinite Push Carousel & Flip Engine
        async function initHeroSlider() {
            const track = document.getElementById('home-slider-track');
            if (!track) return;
            
            const sleep = ms => new Promise(r => setTimeout(r, ms));
 
            while(true) {
                const slides = track.querySelectorAll('.slide');
                if(!slides[0]) break;
                const currentBox = slides[0].querySelector('.flip-box');
 
                await sleep(3500);
                currentBox.classList.add('is-flipped');
                await sleep(3500);
                
                track.style.transition = 'transform 0.8s cubic-bezier(0.65, 0, 0.35, 1)';
                track.style.transform = `translateX(-100%)`;
 
                await sleep(900);
 
                track.style.transition = 'none';
                track.style.transform = `translateX(0)`;
                track.appendChild(slides[0]);
 
                const inner = currentBox.querySelector('.flip-box-inner');
                inner.style.transition = 'none';
                currentBox.classList.remove('is-flipped');
                
                void currentBox.offsetWidth;
                inner.style.transition = '';
            }
        }
 
        document.addEventListener('DOMContentLoaded', () => {
            initHeroSlider();
        });
