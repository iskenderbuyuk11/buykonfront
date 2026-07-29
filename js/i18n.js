/**
 * Buykon i18n — dil seçimi və tərcümələr
 * AZ | TR | ZH | KA | KK | UZ | AR | EN
 */
(function (global) {
  "use strict";

  var STORAGE_KEY = "buykon_lang";
  var DEFAULT_LANG = "az";

  var LANGUAGES = [
    { code: "az", short: "AZ", native: "Azərbaycan", flag: "az" },
    { code: "tr", short: "TR", native: "Türkçe", flag: "tr" },
    { code: "zh", short: "CN", native: "中文", flag: "cn" },
    { code: "ka", short: "GE", native: "ქართული", flag: "ge" },
    { code: "kk", short: "KZ", native: "Қазақша", flag: "kz" },
    { code: "uz", short: "UZ", native: "Oʻzbekcha", flag: "uz" },
    { code: "ar", short: "AR", native: "العربية", flag: "sa", rtl: true },
    { code: "en", short: "EN", native: "English", flag: "gb" },
  ];

  var COUNTRY_LANG = {
    AZ: "az",
    TR: "tr",
    CN: "zh",
    GE: "ka",
    KZ: "kk",
    UZ: "uz",
    AE: "ar",
    SA: "ar",
    QA: "ar",
    GB: "en",
    US: "en",
    CA: "en",
    AU: "en",
    IN: "en",
    IE: "en",
    NZ: "en",
  };

  var DICT = {
    az: {
      "marquee.test": "Sayt hal-hazırda test versiyasındadır, alış-veriş qəbul olunmur. Xahiş edirik heç bir əməliyyat aparmayın",
      "nav.sell": "Bizdə Sat",
      "nav.about": "Haqqımızda",
      "nav.delivery": "Çatdırılma",
      "nav.return": "Qaytarılma",
      "nav.contact": "Əlaqə",
      "nav.info": "Məlumat",
      "nav.home": "Ana səhifə",
      "nav.products": "Məhsullar",
      "nav.categories": "Kateqoriyalar",
      "nav.discounts": "Endirimlər",
      "nav.seller": "Satıcı ol",
      "nav.cart": "Səbət",
      "nav.favorites": "Sevimlilər",
      "nav.profile": "Profil",
      "nav.search": "Axtarış",
      "nav.menu": "Menyu",
      "nav.orders": "Sifarişlərim",
      "nav.settings": "Tənzimləmələr",
      "nav.logout": "Çıxış",
      "nav.account_menu": "Hesab menyusu",
      "nav.toolbar": "Alət sətri",
      "nav.main": "Əsas naviqasiya",
      "theme.dark": "Tünd rejimi aktiv et",
      "theme.light": "İşıqlı rejimi aktiv et",
      "theme.mode": "Tema rejimi",
      "theme.dark_on": "Tünd rejim aktivdir",
      "theme.light_on": "İşıqlı rejim aktivdir",
      "lang.label": "Dil",
      "lang.choose": "Dil seçin",
      "auth.login": "Giriş",
      "auth.register": "Qeydiyyat",
      "auth.login_title": "Hesabınıza daxil olun",
      "auth.login_hint": "Sifarişlərinizi izləyin və sürətli alış-veriş edin.",
      "auth.profile_orders": "Profil və sifarişlər",
      "menu.close": "Bağla",
      "menu.close_menu": "Menyunu bağla",
      "menu.shop": "Alış-veriş",
      "menu.support_info": "Dəstək & məlumat",
      "menu.catalog_all": "Bütün kataloq",
      "menu.catalog_sections": "Seçilmiş bölmələr",
      "menu.open_store": "Mağazanı aç",
      "menu.who_we": "Biz kimik",
      "menu.delivery_rules": "Çatdırılma qaydaları",
      "menu.return_rules": "Geri qaytarma",
      "menu.write_us": "Bizimlə yazın",
      "menu.terms": "İstifadə şərtləri",
      "menu.rules": "Qaydalar",
      "menu.support": "Müştəri dəstəyi",
      "menu.support_sub": "7/24 sizinlə birlikdəyik",
      "menu.phone": "Telefon",
      "menu.email": "E-poçt",
      "menu.wa_line": "Dəstək xətti",
      "menu.shop_support": "Alış-veriş & dəstək",
      "footer.nav": "Naviqasiya",
      "footer.social": "Sosial",
      "footer.legal": "Hüquqi",
      "footer.privacy": "Məxfilik qaydaları",
      "footer.terms": "İstifadə şərtləri",
      "footer.return": "Geri qaytarma",
      "footer.tagline": "Gəlin birlikdə böyük işlər görək. Alış-verişi sadə və sürətli edək.",
      "footer.note": "Buykon — etibarlı satıcılar, təhlükəsiz ödəniş və sürətli çatdırılma ilə Azərbaycanın onlayn bazarı.",
      "footer.home": "Buykon ana səhifə",
      "obx.welcome": "Xoş gəlmisiniz",
      "obx.country_title": "Ölkənizi seçin",
      "obx.country_sub": "Sizə uyğun məhsul və çatdırılma üçün",
      "obx.gender_title": "Cinsiyyətinizi seçin",
      "obx.gender_sub": "Sizə uyğun təkliflər göstərək",
      "obx.search": "Ölkə axtar...",
      "obx.auto": "Avtomatik təyin et",
      "obx.auto_hint": "Yerləşdiyiniz ölkə avtomatik tapılsın",
      "obx.detecting": "Ölkəniz təyin edilir...",
      "obx.detect_fail": "Təyin etmək mümkün olmadı, siyahıdan seçin",
      "obx.found": "Tapıldı",
      "obx.male": "Kişi",
      "obx.female": "Qadın",
      "obx.next": "Davam et",
      "obx.finish": "Bitir",
      "obx.back": "Geri",
      "obx.skip": "İndi yox, sonra seçəcəm",
      "cat.all": "Hamısı",
      "cat.women": "Qadın",
      "cat.men": "Kişi",
      "cat.supermarket": "Supermarket",
      "cat.cosmetics": "Kosmetika",
      "cat.kids": "Ana & Uşaq",
      "cat.electronics": "Elektronika",
      "cat.home": "Ev",
    },
    tr: {
      "marquee.test": "Site şu anda test sürümündedir, alışveriş kabul edilmemektedir. Lütfen işlem yapmayın",
      "nav.sell": "Bizde Sat",
      "nav.about": "Hakkımızda",
      "nav.delivery": "Teslimat",
      "nav.return": "İade",
      "nav.contact": "İletişim",
      "nav.info": "Bilgi",
      "nav.home": "Ana sayfa",
      "nav.products": "Ürünler",
      "nav.categories": "Kategoriler",
      "nav.discounts": "İndirimler",
      "nav.seller": "Satıcı ol",
      "nav.cart": "Sepet",
      "nav.favorites": "Favoriler",
      "nav.profile": "Profil",
      "nav.search": "Ara",
      "nav.menu": "Menü",
      "nav.orders": "Siparişlerim",
      "nav.settings": "Ayarlar",
      "nav.logout": "Çıkış",
      "nav.account_menu": "Hesap menüsü",
      "nav.toolbar": "Araç çubuğu",
      "nav.main": "Ana gezinme",
      "theme.dark": "Karanlık modu aç",
      "theme.light": "Aydınlık modu aç",
      "theme.mode": "Tema modu",
      "theme.dark_on": "Karanlık mod açık",
      "theme.light_on": "Aydınlık mod açık",
      "lang.label": "Dil",
      "lang.choose": "Dil seçin",
      "auth.login": "Giriş",
      "auth.register": "Kayıt",
      "auth.login_title": "Hesabınıza giriş yapın",
      "auth.login_hint": "Siparişlerinizi takip edin ve hızlı alışveriş yapın.",
      "auth.profile_orders": "Profil ve siparişler",
      "menu.close": "Kapat",
      "menu.close_menu": "Menüyü kapat",
      "menu.shop": "Alışveriş",
      "menu.support_info": "Destek & bilgi",
      "menu.catalog_all": "Tüm katalog",
      "menu.catalog_sections": "Seçili bölümler",
      "menu.open_store": "Mağaza aç",
      "menu.who_we": "Biz kimiz",
      "menu.delivery_rules": "Teslimat kuralları",
      "menu.return_rules": "İade",
      "menu.write_us": "Bize yazın",
      "menu.terms": "Kullanım şartları",
      "menu.rules": "Kurallar",
      "menu.support": "Müşteri desteği",
      "menu.support_sub": "7/24 yanınızdayız",
      "menu.phone": "Telefon",
      "menu.email": "E-posta",
      "menu.wa_line": "Destek hattı",
      "menu.shop_support": "Alışveriş & destek",
      "footer.nav": "Gezinme",
      "footer.social": "Sosyal",
      "footer.legal": "Yasal",
      "footer.privacy": "Gizlilik politikası",
      "footer.terms": "Kullanım şartları",
      "footer.return": "İade",
      "footer.tagline": "Birlikte büyük işler yapalım. Alışverişi basit ve hızlı hale getirelim.",
      "footer.note": "Buykon — güvenilir satıcılar, güvenli ödeme ve hızlı teslimat ile online pazar.",
      "footer.home": "Buykon ana sayfa",
      "obx.welcome": "Hoş geldiniz",
      "obx.country_title": "Ülkenizi seçin",
      "obx.country_sub": "Size uygun ürün ve teslimat için",
      "obx.gender_title": "Cinsiyetinizi seçin",
      "obx.gender_sub": "Size uygun teklifler gösterelim",
      "obx.search": "Ülke ara...",
      "obx.auto": "Otomatik belirle",
      "obx.auto_hint": "Bulunduğunuz ülke otomatik bulunsun",
      "obx.detecting": "Ülkeniz belirleniyor...",
      "obx.detect_fail": "Belirlenemedi, listeden seçin",
      "obx.found": "Bulundu",
      "obx.male": "Erkek",
      "obx.female": "Kadın",
      "obx.next": "Devam et",
      "obx.finish": "Bitir",
      "obx.back": "Geri",
      "obx.skip": "Şimdi değil, sonra seçerim",
      "cat.all": "Tümü",
      "cat.women": "Kadın",
      "cat.men": "Erkek",
      "cat.supermarket": "Market",
      "cat.cosmetics": "Kozmetik",
      "cat.kids": "Anne & Çocuk",
      "cat.electronics": "Elektronik",
      "cat.home": "Ev",
    },
    zh: {
      "marquee.test": "网站目前为测试版本，暂不接受购物。请勿进行任何操作",
      "nav.sell": "在我们这里卖",
      "nav.about": "关于我们",
      "nav.delivery": "配送",
      "nav.return": "退货",
      "nav.contact": "联系",
      "nav.info": "信息",
      "nav.home": "首页",
      "nav.products": "商品",
      "nav.categories": "分类",
      "nav.discounts": "折扣",
      "nav.seller": "成为卖家",
      "nav.cart": "购物车",
      "nav.favorites": "收藏",
      "nav.profile": "个人中心",
      "nav.search": "搜索",
      "nav.menu": "菜单",
      "nav.orders": "我的订单",
      "nav.settings": "设置",
      "nav.logout": "退出",
      "nav.account_menu": "账户菜单",
      "nav.toolbar": "工具栏",
      "nav.main": "主导航",
      "theme.dark": "开启深色模式",
      "theme.light": "开启浅色模式",
      "theme.mode": "主题模式",
      "theme.dark_on": "深色模式已开启",
      "theme.light_on": "浅色模式已开启",
      "lang.label": "语言",
      "lang.choose": "选择语言",
      "auth.login": "登录",
      "auth.register": "注册",
      "auth.login_title": "登录您的账户",
      "auth.login_hint": "跟踪订单并快速购物。",
      "auth.profile_orders": "个人资料与订单",
      "menu.close": "关闭",
      "menu.close_menu": "关闭菜单",
      "menu.shop": "购物",
      "menu.support_info": "支持与信息",
      "menu.catalog_all": "全部目录",
      "menu.catalog_sections": "精选分类",
      "menu.open_store": "开设店铺",
      "menu.who_we": "我们是谁",
      "menu.delivery_rules": "配送规则",
      "menu.return_rules": "退货",
      "menu.write_us": "联系我们",
      "menu.terms": "使用条款",
      "menu.rules": "规则",
      "menu.support": "客户支持",
      "menu.support_sub": "全天候为您服务",
      "menu.phone": "电话",
      "menu.email": "邮箱",
      "menu.wa_line": "支持热线",
      "menu.shop_support": "购物与支持",
      "footer.nav": "导航",
      "footer.social": "社交",
      "footer.legal": "法律",
      "footer.privacy": "隐私政策",
      "footer.terms": "使用条款",
      "footer.return": "退货",
      "footer.tagline": "一起成就大事。让购物更简单、更快捷。",
      "footer.note": "Buykon — 可信卖家、安全支付与快速配送的在线市场。",
      "footer.home": "Buykon 首页",
      "obx.welcome": "欢迎",
      "obx.country_title": "选择您的国家",
      "obx.country_sub": "以便为您提供合适的商品和配送",
      "obx.gender_title": "选择您的性别",
      "obx.gender_sub": "我们将为您展示合适的推荐",
      "obx.search": "搜索国家...",
      "obx.auto": "自动检测",
      "obx.auto_hint": "自动查找您所在的国家",
      "obx.detecting": "正在检测国家...",
      "obx.detect_fail": "无法检测，请从列表中选择",
      "obx.found": "已找到",
      "obx.male": "男",
      "obx.female": "女",
      "obx.next": "继续",
      "obx.finish": "完成",
      "obx.back": "返回",
      "obx.skip": "稍后选择",
      "cat.all": "全部",
      "cat.women": "女装",
      "cat.men": "男装",
      "cat.supermarket": "超市",
      "cat.cosmetics": "美妆",
      "cat.kids": "母婴",
      "cat.electronics": "电子产品",
      "cat.home": "家居",
    },
    ka: {
      "marquee.test": "საიტი ამჟამად სატესტო ვერსიაშია, შოპინგი არ მიიღება. გთხოვთ არ განახორციელოთ ოპერაციები",
      "nav.sell": "გაყიდე ჩვენთან",
      "nav.about": "ჩვენს შესახებ",
      "nav.delivery": "მიწოდება",
      "nav.return": "დაბრუნება",
      "nav.contact": "კონტაქტი",
      "nav.info": "ინფო",
      "nav.home": "მთავარი",
      "nav.products": "პროდუქტები",
      "nav.categories": "კატეგორიები",
      "nav.discounts": "ფასდაკლებები",
      "nav.seller": "გახდი გამყიდველი",
      "nav.cart": "კალათა",
      "nav.favorites": "რჩეულები",
      "nav.profile": "პროფილი",
      "nav.search": "ძიება",
      "nav.menu": "მენიუ",
      "nav.orders": "ჩემი შეკვეთები",
      "nav.settings": "პარამეტრები",
      "nav.logout": "გასვლა",
      "nav.account_menu": "ანგარიშის მენიუ",
      "nav.toolbar": "ხელსაწყოები",
      "nav.main": "მთავარი ნავიგაცია",
      "theme.dark": "მუქი რეჟიმი",
      "theme.light": "ნათელი რეჟიმი",
      "theme.mode": "თემა",
      "theme.dark_on": "მუქი რეჟიმი ჩართულია",
      "theme.light_on": "ნათელი რეჟიმი ჩართულია",
      "lang.label": "ენა",
      "lang.choose": "აირჩიეთ ენა",
      "auth.login": "შესვლა",
      "auth.register": "რეგისტრაცია",
      "auth.login_title": "შედით ანგარიშში",
      "auth.login_hint": "თვალყური ადევნეთ შეკვეთებს და იყიდეთ სწრაფად.",
      "auth.profile_orders": "პროფილი და შეკვეთები",
      "menu.close": "დახურვა",
      "menu.close_menu": "მენიუს დახურვა",
      "menu.shop": "შოპინგი",
      "menu.support_info": "მხარდაჭერა და ინფო",
      "menu.catalog_all": "მთელი კატალოგი",
      "menu.catalog_sections": "შერჩეული განყოფილებები",
      "menu.open_store": "მაღაზიის გახსნა",
      "menu.who_we": "ვინ ვართ",
      "menu.delivery_rules": "მიწოდების წესები",
      "menu.return_rules": "დაბრუნება",
      "menu.write_us": "მოგვწერეთ",
      "menu.terms": "გამოყენების პირობები",
      "menu.rules": "წესები",
      "menu.support": "მხარდაჭერა",
      "menu.support_sub": "24/7 თქვენთან ერთად",
      "menu.phone": "ტელეფონი",
      "menu.email": "ელფოსტა",
      "menu.wa_line": "მხარდაჭერის ხაზი",
      "menu.shop_support": "შოპინგი და მხარდაჭერა",
      "footer.nav": "ნავიგაცია",
      "footer.social": "სოციალური",
      "footer.legal": "იურიდიული",
      "footer.privacy": "კონფიდენციალურობა",
      "footer.terms": "გამოყენების პირობები",
      "footer.return": "დაბრუნება",
      "footer.tagline": "ერთად დიდი საქმეები გავაკეთოთ. შოპინგი გავხადოთ მარტივი და სწრაფი.",
      "footer.note": "Buykon — სანდო გამყიდველები, უსაფრთხო გადახდა და სწრაფი მიწოდება.",
      "footer.home": "Buykon მთავარი",
      "obx.welcome": "კეთილი იყოს თქვენი მობრძანება",
      "obx.country_title": "აირჩიეთ ქვეყანა",
      "obx.country_sub": "შესაბამისი პროდუქტებისა და მიწოდებისთვის",
      "obx.gender_title": "აირჩიეთ სქესი",
      "obx.gender_sub": "შემოგთავაზებთ შესაბამის შეთავაზებებს",
      "obx.search": "ქვეყნის ძიება...",
      "obx.auto": "ავტომატური განსაზღვრა",
      "obx.auto_hint": "ავტომატურად მოიძებნოს თქვენი ქვეყანა",
      "obx.detecting": "ქვეყანა განისაზღვრება...",
      "obx.detect_fail": "ვერ განისაზღვრა, აირჩიეთ სიიდან",
      "obx.found": "ნაპოვნია",
      "obx.male": "კაცი",
      "obx.female": "ქალი",
      "obx.next": "გაგრძელება",
      "obx.finish": "დასრულება",
      "obx.back": "უკან",
      "obx.skip": "ახლა არა, მოგვიანებით",
      "cat.all": "ყველა",
      "cat.women": "ქალი",
      "cat.men": "კაცი",
      "cat.supermarket": "სუპერმარკეტი",
      "cat.cosmetics": "კოსმეტიკა",
      "cat.kids": "დედა და ბავშვი",
      "cat.electronics": "ელექტრონიკა",
      "cat.home": "სახლი",
    },
    kk: {
      "marquee.test": "Сайт қазір тест нұсқасында, сатып алу қабылданбайды. Операция жасамаңыз",
      "nav.sell": "Бізде сат",
      "nav.about": "Біз туралы",
      "nav.delivery": "Жеткізу",
      "nav.return": "Қайтару",
      "nav.contact": "Байланыс",
      "nav.info": "Ақпарат",
      "nav.home": "Басты бет",
      "nav.products": "Тауарлар",
      "nav.categories": "Санаттар",
      "nav.discounts": "Жеңілдіктер",
      "nav.seller": "Сатушы бол",
      "nav.cart": "Себет",
      "nav.favorites": "Таңдаулылар",
      "nav.profile": "Профиль",
      "nav.search": "Іздеу",
      "nav.menu": "Мәзір",
      "nav.orders": "Тапсырыстарым",
      "nav.settings": "Баптаулар",
      "nav.logout": "Шығу",
      "nav.account_menu": "Аккаунт мәзірі",
      "nav.toolbar": "Құралдар тақтасы",
      "nav.main": "Негізгі навигация",
      "theme.dark": "Қараңғы режимді қосу",
      "theme.light": "Жарық режимді қосу",
      "theme.mode": "Тема режимі",
      "theme.dark_on": "Қараңғы режим қосулы",
      "theme.light_on": "Жарық режим қосулы",
      "lang.label": "Тіл",
      "lang.choose": "Тілді таңдаңыз",
      "auth.login": "Кіру",
      "auth.register": "Тіркелу",
      "auth.login_title": "Аккаунтқа кіріңіз",
      "auth.login_hint": "Тапсырыстарды қадағалаңыз және жылдам сатып алыңыз.",
      "auth.profile_orders": "Профиль және тапсырыстар",
      "menu.close": "Жабу",
      "menu.close_menu": "Мәзірді жабу",
      "menu.shop": "Сатып алу",
      "menu.support_info": "Қолдау және ақпарат",
      "menu.catalog_all": "Бүкіл каталог",
      "menu.catalog_sections": "Таңдалған бөлімдер",
      "menu.open_store": "Дүкен ашу",
      "menu.who_we": "Біз кімбіз",
      "menu.delivery_rules": "Жеткізу ережелері",
      "menu.return_rules": "Қайтару",
      "menu.write_us": "Бізге жазыңыз",
      "menu.terms": "Пайдалану шарттары",
      "menu.rules": "Ережелер",
      "menu.support": "Клиенттерді қолдау",
      "menu.support_sub": "7/24 сізбен біргеміз",
      "menu.phone": "Телефон",
      "menu.email": "Email",
      "menu.wa_line": "Қолдау желісі",
      "menu.shop_support": "Сатып алу және қолдау",
      "footer.nav": "Навигация",
      "footer.social": "Әлеуметтік",
      "footer.legal": "Құқықтық",
      "footer.privacy": "Құпиялылық саясаты",
      "footer.terms": "Пайдалану шарттары",
      "footer.return": "Қайтару",
      "footer.tagline": "Бірге үлкен істер жасайық. Сатып алуды қарапайым әрі жылдам етейік.",
      "footer.note": "Buykon — сенімді сатушылар, қауіпсіз төлем және жылдам жеткізу.",
      "footer.home": "Buykon басты бет",
      "obx.welcome": "Қош келдіңіз",
      "obx.country_title": "Елді таңдаңыз",
      "obx.country_sub": "Сізге сай тауар мен жеткізу үшін",
      "obx.gender_title": "Жынысыңызды таңдаңыз",
      "obx.gender_sub": "Сізге сай ұсыныстар көрсетейік",
      "obx.search": "Елді іздеу...",
      "obx.auto": "Автоматты анықтау",
      "obx.auto_hint": "Орналасқан еліңіз автоматты табылсын",
      "obx.detecting": "Ел анықталуда...",
      "obx.detect_fail": "Анықталмады, тізімнен таңдаңыз",
      "obx.found": "Табылды",
      "obx.male": "Ер",
      "obx.female": "Әйел",
      "obx.next": "Жалғастыру",
      "obx.finish": "Аяқтау",
      "obx.back": "Артқа",
      "obx.skip": "Қазір емес, кейін таңдаймын",
      "cat.all": "Барлығы",
      "cat.women": "Әйел",
      "cat.men": "Ер",
      "cat.supermarket": "Супермаркет",
      "cat.cosmetics": "Косметика",
      "cat.kids": "Ана және бала",
      "cat.electronics": "Электроника",
      "cat.home": "Үй",
    },
    uz: {
      "marquee.test": "Sayt hozir test versiyasida, xarid qabul qilinmaydi. Iltimos, hech qanday amal bajarmang",
      "nav.sell": "Bizda sot",
      "nav.about": "Biz haqimizda",
      "nav.delivery": "Yetkazib berish",
      "nav.return": "Qaytarish",
      "nav.contact": "Aloqa",
      "nav.info": "Ma’lumot",
      "nav.home": "Bosh sahifa",
      "nav.products": "Mahsulotlar",
      "nav.categories": "Kategoriyalar",
      "nav.discounts": "Chegirmalar",
      "nav.seller": "Sotuvchi bo‘ling",
      "nav.cart": "Savat",
      "nav.favorites": "Sevimlilar",
      "nav.profile": "Profil",
      "nav.search": "Qidiruv",
      "nav.menu": "Menyu",
      "nav.orders": "Buyurtmalarim",
      "nav.settings": "Sozlamalar",
      "nav.logout": "Chiqish",
      "nav.account_menu": "Hisob menyusi",
      "nav.toolbar": "Asboblar paneli",
      "nav.main": "Asosiy navigatsiya",
      "theme.dark": "Qorong‘u rejimni yoqing",
      "theme.light": "Yorug‘ rejimni yoqing",
      "theme.mode": "Mavzu rejimi",
      "theme.dark_on": "Qorong‘u rejim yoqilgan",
      "theme.light_on": "Yorug‘ rejim yoqilgan",
      "lang.label": "Til",
      "lang.choose": "Tilni tanlang",
      "auth.login": "Kirish",
      "auth.register": "Ro‘yxatdan o‘tish",
      "auth.login_title": "Hisobingizga kiring",
      "auth.login_hint": "Buyurtmalarni kuzating va tez xarid qiling.",
      "auth.profile_orders": "Profil va buyurtmalar",
      "menu.close": "Yopish",
      "menu.close_menu": "Menyuni yopish",
      "menu.shop": "Xarid",
      "menu.support_info": "Yordam va ma’lumot",
      "menu.catalog_all": "Butun katalog",
      "menu.catalog_sections": "Tanlangan bo‘limlar",
      "menu.open_store": "Do‘kon ochish",
      "menu.who_we": "Biz kimmiz",
      "menu.delivery_rules": "Yetkazib berish qoidalari",
      "menu.return_rules": "Qaytarish",
      "menu.write_us": "Bizga yozing",
      "menu.terms": "Foydalanish shartlari",
      "menu.rules": "Qoidalar",
      "menu.support": "Mijozlarga yordam",
      "menu.support_sub": "7/24 siz bilanmiz",
      "menu.phone": "Telefon",
      "menu.email": "Email",
      "menu.wa_line": "Yordam liniyasi",
      "menu.shop_support": "Xarid va yordam",
      "footer.nav": "Navigatsiya",
      "footer.social": "Ijtimoiy",
      "footer.legal": "Huquqiy",
      "footer.privacy": "Maxfiylik siyosati",
      "footer.terms": "Foydalanish shartlari",
      "footer.return": "Qaytarish",
      "footer.tagline": "Birgalikda katta ishlar qilaylik. Xaridni oddiy va tez qilaylik.",
      "footer.note": "Buykon — ishonchli sotuvchilar, xavfsiz to‘lov va tez yetkazib berish.",
      "footer.home": "Buykon bosh sahifa",
      "obx.welcome": "Xush kelibsiz",
      "obx.country_title": "Mamlakatingizni tanlang",
      "obx.country_sub": "Sizga mos mahsulot va yetkazib berish uchun",
      "obx.gender_title": "Jinsingizni tanlang",
      "obx.gender_sub": "Sizga mos takliflarni ko‘rsatamiz",
      "obx.search": "Mamlakat qidirish...",
      "obx.auto": "Avtomatik aniqlash",
      "obx.auto_hint": "Joylashgan mamlakat avtomatik topilsin",
      "obx.detecting": "Mamlakat aniqlanmoqda...",
      "obx.detect_fail": "Aniqlanmadi, ro‘yxatdan tanlang",
      "obx.found": "Topildi",
      "obx.male": "Erkak",
      "obx.female": "Ayol",
      "obx.next": "Davom etish",
      "obx.finish": "Tugatish",
      "obx.back": "Orqaga",
      "obx.skip": "Hozir emas, keyin tanlayman",
      "cat.all": "Hammasi",
      "cat.women": "Ayol",
      "cat.men": "Erkak",
      "cat.supermarket": "Supermarket",
      "cat.cosmetics": "Kosmetika",
      "cat.kids": "Ona va bola",
      "cat.electronics": "Elektronika",
      "cat.home": "Uy",
    },
    ar: {
      "marquee.test": "الموقع حالياً في نسخة تجريبية ولا يقبل عمليات الشراء. يرجى عدم إجراء أي عملية",
      "nav.sell": "بِع معنا",
      "nav.about": "من نحن",
      "nav.delivery": "التوصيل",
      "nav.return": "الإرجاع",
      "nav.contact": "تواصل",
      "nav.info": "معلومات",
      "nav.home": "الرئيسية",
      "nav.products": "المنتجات",
      "nav.categories": "الفئات",
      "nav.discounts": "التخفيضات",
      "nav.seller": "كن بائعاً",
      "nav.cart": "السلة",
      "nav.favorites": "المفضلة",
      "nav.profile": "الملف",
      "nav.search": "بحث",
      "nav.menu": "القائمة",
      "nav.orders": "طلباتي",
      "nav.settings": "الإعدادات",
      "nav.logout": "خروج",
      "nav.account_menu": "قائمة الحساب",
      "nav.toolbar": "شريط الأدوات",
      "nav.main": "التنقل الرئيسي",
      "theme.dark": "تفعيل الوضع الداكن",
      "theme.light": "تفعيل الوضع الفاتح",
      "theme.mode": "وضع السمة",
      "theme.dark_on": "الوضع الداكن مفعّل",
      "theme.light_on": "الوضع الفاتح مفعّل",
      "lang.label": "اللغة",
      "lang.choose": "اختر اللغة",
      "auth.login": "دخول",
      "auth.register": "تسجيل",
      "auth.login_title": "سجّل الدخول إلى حسابك",
      "auth.login_hint": "تتبّع طلباتك وتسوّق بسرعة.",
      "auth.profile_orders": "الملف والطلبات",
      "menu.close": "إغلاق",
      "menu.close_menu": "إغلاق القائمة",
      "menu.shop": "التسوق",
      "menu.support_info": "الدعم والمعلومات",
      "menu.catalog_all": "كل الكتالوج",
      "menu.catalog_sections": "أقسام مختارة",
      "menu.open_store": "افتح متجرك",
      "menu.who_we": "من نحن",
      "menu.delivery_rules": "قواعد التوصيل",
      "menu.return_rules": "الإرجاع",
      "menu.write_us": "راسلنا",
      "menu.terms": "شروط الاستخدام",
      "menu.rules": "القواعد",
      "menu.support": "دعم العملاء",
      "menu.support_sub": "معك على مدار الساعة",
      "menu.phone": "هاتف",
      "menu.email": "بريد",
      "menu.wa_line": "خط الدعم",
      "menu.shop_support": "تسوق ودعم",
      "footer.nav": "التنقل",
      "footer.social": "اجتماعي",
      "footer.legal": "قانوني",
      "footer.privacy": "سياسة الخصوصية",
      "footer.terms": "شروط الاستخدام",
      "footer.return": "الإرجاع",
      "footer.tagline": "لننجز معاً أعمالاً كبيرة. لنجعل التسوق بسيطاً وسريعاً.",
      "footer.note": "Buykon — بائعون موثوقون ودفع آمن وتوصيل سريع.",
      "footer.home": "الصفحة الرئيسية لـ Buykon",
      "obx.welcome": "أهلاً بك",
      "obx.country_title": "اختر بلدك",
      "obx.country_sub": "لمنتجات وتوصيل تناسبك",
      "obx.gender_title": "اختر الجنس",
      "obx.gender_sub": "لنعرض لك عروضاً مناسبة",
      "obx.search": "ابحث عن دولة...",
      "obx.auto": "تحديد تلقائي",
      "obx.auto_hint": "اكتشاف بلدك تلقائياً",
      "obx.detecting": "جارٍ تحديد البلد...",
      "obx.detect_fail": "تعذّر التحديد، اختر من القائمة",
      "obx.found": "تم العثور",
      "obx.male": "رجل",
      "obx.female": "امرأة",
      "obx.next": "متابعة",
      "obx.finish": "إنهاء",
      "obx.back": "رجوع",
      "obx.skip": "لاحقاً",
      "cat.all": "الكل",
      "cat.women": "نساء",
      "cat.men": "رجال",
      "cat.supermarket": "سوبرماركت",
      "cat.cosmetics": "تجميل",
      "cat.kids": "أم وطفل",
      "cat.electronics": "إلكترونيات",
      "cat.home": "منزل",
    },
    en: {
      "marquee.test": "The site is currently in test mode; shopping is not accepted. Please do not make any transactions",
      "nav.sell": "Sell with us",
      "nav.about": "About",
      "nav.delivery": "Delivery",
      "nav.return": "Returns",
      "nav.contact": "Contact",
      "nav.info": "Info",
      "nav.home": "Home",
      "nav.products": "Products",
      "nav.categories": "Categories",
      "nav.discounts": "Deals",
      "nav.seller": "Become a seller",
      "nav.cart": "Cart",
      "nav.favorites": "Favorites",
      "nav.profile": "Profile",
      "nav.search": "Search",
      "nav.menu": "Menu",
      "nav.orders": "My orders",
      "nav.settings": "Settings",
      "nav.logout": "Log out",
      "nav.account_menu": "Account menu",
      "nav.toolbar": "Toolbar",
      "nav.main": "Main navigation",
      "theme.dark": "Enable dark mode",
      "theme.light": "Enable light mode",
      "theme.mode": "Theme mode",
      "theme.dark_on": "Dark mode is on",
      "theme.light_on": "Light mode is on",
      "lang.label": "Language",
      "lang.choose": "Choose language",
      "auth.login": "Log in",
      "auth.register": "Sign up",
      "auth.login_title": "Sign in to your account",
      "auth.login_hint": "Track orders and shop faster.",
      "auth.profile_orders": "Profile & orders",
      "menu.close": "Close",
      "menu.close_menu": "Close menu",
      "menu.shop": "Shopping",
      "menu.support_info": "Support & info",
      "menu.catalog_all": "Full catalog",
      "menu.catalog_sections": "Featured sections",
      "menu.open_store": "Open your store",
      "menu.who_we": "Who we are",
      "menu.delivery_rules": "Delivery rules",
      "menu.return_rules": "Returns",
      "menu.write_us": "Write to us",
      "menu.terms": "Terms of use",
      "menu.rules": "Rules",
      "menu.support": "Customer support",
      "menu.support_sub": "We're with you 24/7",
      "menu.phone": "Phone",
      "menu.email": "Email",
      "menu.wa_line": "Support line",
      "menu.shop_support": "Shop & support",
      "footer.nav": "Navigate",
      "footer.social": "Social",
      "footer.legal": "Legal",
      "footer.privacy": "Privacy policy",
      "footer.terms": "Terms of use",
      "footer.return": "Returns",
      "footer.tagline": "Let's build big things together. Make shopping simple and fast.",
      "footer.note": "Buykon — trusted sellers, secure payment and fast delivery online marketplace.",
      "footer.home": "Buykon home",
      "obx.welcome": "Welcome",
      "obx.country_title": "Select your country",
      "obx.country_sub": "For products and delivery that fit you",
      "obx.gender_title": "Select your gender",
      "obx.gender_sub": "We'll show offers that suit you",
      "obx.search": "Search country...",
      "obx.auto": "Detect automatically",
      "obx.auto_hint": "Find your country automatically",
      "obx.detecting": "Detecting your country...",
      "obx.detect_fail": "Could not detect, pick from the list",
      "obx.found": "Found",
      "obx.male": "Male",
      "obx.female": "Female",
      "obx.next": "Continue",
      "obx.finish": "Finish",
      "obx.back": "Back",
      "obx.skip": "Not now, I'll choose later",
      "cat.all": "All",
      "cat.women": "Women",
      "cat.men": "Men",
      "cat.supermarket": "Supermarket",
      "cat.cosmetics": "Beauty",
      "cat.kids": "Mom & kids",
      "cat.electronics": "Electronics",
      "cat.home": "Home",
    },
  };

  /* Ana səhifə + ümumi səhifə mətnləri */
  var PAGE = {
    az: {
      "home.popular": "Populyar məhsullar",
      "home.sale": "Endirimli məhsullar",
      "home.all_products": "Bütün məhsullar",
      "home.categories": "Kateqoriyalar",
      "home.view_all": "Hamısına bax",
      "home.sort": "Sırala",
      "home.sort_popular": "Populyar",
      "home.sort_price_asc": "Qiymət: aşağıdan yuxarı",
      "home.sort_price_desc": "Qiymət: yuxarıdan aşağı",
      "home.scroll_prev": "Geriyə sürüşdür",
      "home.scroll_next": "İrəli sürüşdür",
      "home.why_badge": "Niyə biz?",
      "home.why_title_1": "Güvən və",
      "home.why_title_2": "şəffaflıq",
      "home.why_lead": "Seçilmiş məhsullar, aydın qiymətlər və hər addımda dəstək — alış-verişi sadələşdiririk.",
      "home.why_ship": "Sürətli çatdırılma",
      "home.why_ship_text": "Sifarişlərinizi qısa müddətdə emal edirik; Bakı üzrə çevik çatdırılma seçimləri.",
      "home.why_pay": "Təhlükəsiz ödəniş",
      "home.why_pay_text": "Ödəniş məlumatlarınız qorunur; tanınmış üsullarla rahat ödəniş.",
      "home.why_price": "Sərfəli qiymət",
      "home.why_price_text": "Kampaniya və endirimlərlə seçilmiş məhsulları əlverişli təklif edirik.",
      "home.why_support": "Müştəri dəstəyi",
      "home.why_support_text": "Suallarınız üçün komandamız həmişə yanınızdadır.",
      "home.faq": "Tez-tez verilən suallar",
      "home.faq_sub": "Alış-veriş, çatdırılma və hesab barədə ən çox soruşulanlar.",
      "home.spin_title": "Fırlat. Qazan.Təkrar et.",
      "home.spin_sub": "Həftəlik şərtləri tamamla, çarxı fırlat və premium endirim, kupon və bonus balans qazan.",
      "home.spin_btn": "Fırlat",
      "home.spin_need": "Fırlatmaq üçün bütün şərtləri tamamla",
      "cat.electronics": "Elektronika",
      "cat.clothing": "Geyim",
      "cat.home_life": "Ev & yaşam",
      "cat.accessories": "Aksesuarlar",
      "cat.appliances": "Məişət texnikası",
      "cat.laptops": "Notbuklar",
      "cat.sport": "İdman",
      "cat.children": "Uşaqlar",
      "cat.games": "Oyun",
      "cat.entertainment": "Əyləncə",
      "cat.women_link": "Qadın",
      "cat.men_link": "Kişi",
      "page.about": "Haqqımızda",
      "page.delivery": "Çatdırılma",
      "page.return": "Qaytarılma",
      "page.contact": "Əlaqə",
      "page.login": "Giriş",
      "page.register": "Qeydiyyat",
      "page.cart": "Səbət",
      "page.favorites": "Sevimlilər",
      "page.orders": "Sifarişlərim",
      "page.profile": "Profil",
      "page.privacy": "Məxfilik qaydaları",
      "page.terms": "İstifadə şərtləri",
      "page.support": "Dəstək",
      "ui.add_cart": "Səbətə əlavə et",
      "ui.buy_now": "İndi al",
      "ui.free_ship": "Pulsuz çatdırılma",
      "ui.empty_cart": "Səbətiniz boşdur",
      "ui.empty_fav": "Sevimlilər siyahısı boşdur",
      "ui.loading": "Yüklənir...",
      "ui.search_ph": "Məhsul, brend və ya kateqoriya axtar...",
      "ui.continue": "Davam et",
      "ui.save": "Yadda saxla",
      "ui.cancel": "Ləğv et",
      "ui.send": "Göndər",
      "ui.details": "Ətraflı",
      "ui.back_home": "Ana səhifəyə qayıt",
    },
    tr: {
      "home.popular": "Popüler ürünler",
      "home.sale": "İndirimli ürünler",
      "home.all_products": "Tüm ürünler",
      "home.categories": "Kategoriler",
      "home.view_all": "Tümünü gör",
      "home.sort": "Sırala",
      "home.sort_popular": "Popüler",
      "home.sort_price_asc": "Fiyat: düşükten yükseğe",
      "home.sort_price_desc": "Fiyat: yüksekten düşüğe",
      "home.scroll_prev": "Geri kaydır",
      "home.scroll_next": "İleri kaydır",
      "home.why_badge": "Neden biz?",
      "home.why_title_1": "Güven ve",
      "home.why_title_2": "şeffaflık",
      "home.why_lead": "Seçilmiş ürünler, net fiyatlar ve her adımda destek — alışverişi sadeleştiriyoruz.",
      "home.why_ship": "Hızlı teslimat",
      "home.why_ship_text": "Siparişlerinizi kısa sürede işliyoruz; esnek teslimat seçenekleri.",
      "home.why_pay": "Güvenli ödeme",
      "home.why_pay_text": "Ödeme bilgileriniz korunur; bilinen yöntemlerle rahat ödeme.",
      "home.why_price": "Uygun fiyat",
      "home.why_price_text": "Kampanya ve indirimlerle seçilmiş ürünleri uygun sunuyoruz.",
      "home.why_support": "Müşteri desteği",
      "home.why_support_text": "Sorularınız için ekibimiz her zaman yanınızda.",
      "home.faq": "Sık sorulan sorular",
      "home.faq_sub": "Alışveriş, teslimat ve hesap hakkında en çok sorulanlar.",
      "home.spin_title": "Çevir. Kazan. Tekrar et.",
      "home.spin_sub": "Haftalık şartları tamamla, çarkı çevir ve premium indirim, kupon ve bonus bakiye kazan.",
      "home.spin_btn": "Çevir",
      "home.spin_need": "Çevirmek için tüm şartları tamamla",
      "cat.electronics": "Elektronik",
      "cat.clothing": "Giyim",
      "cat.home_life": "Ev & yaşam",
      "cat.accessories": "Aksesuarlar",
      "cat.appliances": "Ev aletleri",
      "cat.laptops": "Dizüstü bilgisayarlar",
      "cat.sport": "Spor",
      "cat.children": "Çocuklar",
      "cat.games": "Oyun",
      "cat.entertainment": "Eğlence",
      "cat.women_link": "Kadın",
      "cat.men_link": "Erkek",
      "page.about": "Hakkımızda",
      "page.delivery": "Teslimat",
      "page.return": "İade",
      "page.contact": "İletişim",
      "page.login": "Giriş",
      "page.register": "Kayıt",
      "page.cart": "Sepet",
      "page.favorites": "Favoriler",
      "page.orders": "Siparişlerim",
      "page.profile": "Profil",
      "page.privacy": "Gizlilik politikası",
      "page.terms": "Kullanım şartları",
      "page.support": "Destek",
      "ui.add_cart": "Sepete ekle",
      "ui.buy_now": "Şimdi al",
      "ui.free_ship": "Ücretsiz kargo",
      "ui.empty_cart": "Sepetiniz boş",
      "ui.empty_fav": "Favori listesi boş",
      "ui.loading": "Yükleniyor...",
      "ui.search_ph": "Ürün, marka veya kategori ara...",
      "ui.continue": "Devam et",
      "ui.save": "Kaydet",
      "ui.cancel": "İptal",
      "ui.send": "Gönder",
      "ui.details": "Detaylar",
      "ui.back_home": "Ana sayfaya dön",
    },
    zh: {
      "home.popular": "热门商品",
      "home.sale": "折扣商品",
      "home.all_products": "全部商品",
      "home.categories": "分类",
      "home.view_all": "查看全部",
      "home.sort": "排序",
      "home.sort_popular": "热门",
      "home.sort_price_asc": "价格：从低到高",
      "home.sort_price_desc": "价格：从高到低",
      "home.scroll_prev": "向后滑动",
      "home.scroll_next": "向前滑动",
      "home.why_badge": "为什么选择我们？",
      "home.why_title_1": "信任与",
      "home.why_title_2": "透明",
      "home.why_lead": "精选商品、清晰价格、全程支持——让购物更简单。",
      "home.why_ship": "快速配送",
      "home.why_ship_text": "我们快速处理订单，并提供灵活的配送选择。",
      "home.why_pay": "安全支付",
      "home.why_pay_text": "支付信息受保护，可通过常用方式轻松付款。",
      "home.why_price": "实惠价格",
      "home.why_price_text": "通过活动和折扣提供精选优惠商品。",
      "home.why_support": "客户支持",
      "home.why_support_text": "我们的团队随时为您解答问题。",
      "home.faq": "常见问题",
      "home.faq_sub": "关于购物、配送和账户的常见问题。",
      "home.spin_title": "旋转。赢取。再来。",
      "home.spin_sub": "完成每周条件，转动转盘，赢取高级折扣、优惠券和奖励余额。",
      "home.spin_btn": "旋转",
      "home.spin_need": "完成所有条件后即可旋转",
      "cat.electronics": "电子产品",
      "cat.clothing": "服装",
      "cat.home_life": "家居生活",
      "cat.accessories": "配件",
      "cat.appliances": "家电",
      "cat.laptops": "笔记本电脑",
      "cat.sport": "运动",
      "cat.children": "儿童",
      "cat.games": "游戏",
      "cat.entertainment": "娱乐",
      "cat.women_link": "女装",
      "cat.men_link": "男装",
      "page.about": "关于我们",
      "page.delivery": "配送",
      "page.return": "退货",
      "page.contact": "联系",
      "page.login": "登录",
      "page.register": "注册",
      "page.cart": "购物车",
      "page.favorites": "收藏",
      "page.orders": "我的订单",
      "page.profile": "个人中心",
      "page.privacy": "隐私政策",
      "page.terms": "使用条款",
      "page.support": "支持",
      "ui.add_cart": "加入购物车",
      "ui.buy_now": "立即购买",
      "ui.free_ship": "免费配送",
      "ui.empty_cart": "购物车是空的",
      "ui.empty_fav": "收藏列表为空",
      "ui.loading": "加载中...",
      "ui.search_ph": "搜索商品、品牌或分类...",
      "ui.continue": "继续",
      "ui.save": "保存",
      "ui.cancel": "取消",
      "ui.send": "发送",
      "ui.details": "详情",
      "ui.back_home": "返回首页",
    },
    ka: {
      "home.popular": "პოპულარული პროდუქტები",
      "home.sale": "ფასდაკლებული პროდუქტები",
      "home.all_products": "ყველა პროდუქტი",
      "home.categories": "კატეგორიები",
      "home.view_all": "ყველას ნახვა",
      "home.sort": "დალაგება",
      "home.sort_popular": "პოპულარული",
      "home.sort_price_asc": "ფასი: დაბლიდან მაღლა",
      "home.sort_price_desc": "ფასი: მაღლიდან დაბლა",
      "home.scroll_prev": "უკან გადაადგილება",
      "home.scroll_next": "წინ გადაადგილება",
      "home.why_badge": "რატომ ჩვენ?",
      "home.why_title_1": "ნდობა და",
      "home.why_title_2": "გამჭვირვალობა",
      "home.why_lead": "შერჩეული პროდუქტები, ნათელი ფასები და მხარდაჭერა ყოველ ნაბიჯზე.",
      "home.why_ship": "სწრაფი მიწოდება",
      "home.why_ship_text": "შეკვეთებს სწრაფად ვამუშავებთ; მოქნილი მიწოდების ვარიანტები.",
      "home.why_pay": "უსაფრთხო გადახდა",
      "home.why_pay_text": "გადახდის მონაცემები დაცულია; მოსახერხებელი გადახდა.",
      "home.why_price": "ხელსაყრელი ფასი",
      "home.why_price_text": "აქციებითა და ფასდაკლებებით შერჩეულ პროდუქტებს გთავაზობთ.",
      "home.why_support": "მხარდაჭერა",
      "home.why_support_text": "ჩვენი გუნდი ყოველთვის თქვენს გვერდითაა.",
      "home.faq": "ხშირად დასმული კითხვები",
      "home.faq_sub": "შოპინგი, მიწოდება და ანგარიში.",
      "home.spin_title": "დაატრიალე. მოიგე. გაიმეორე.",
      "home.spin_sub": "შეასრულე ყოველკვირეული პირობები და მოიგე პრემიუმ ფასდაკლება.",
      "home.spin_btn": "დატრიალება",
      "home.spin_need": "დასატრიალებლად შეასრულე ყველა პირობა",
      "cat.electronics": "ელექტრონიკა",
      "cat.clothing": "ტანსაცმელი",
      "cat.home_life": "სახლი და ცხოვრება",
      "cat.accessories": "აქსესუარები",
      "cat.appliances": "საყოფაცხოვრებო ტექნიკა",
      "cat.laptops": "ნოუთბუქები",
      "cat.sport": "სპორტი",
      "cat.children": "ბავშვები",
      "cat.games": "თამაშები",
      "cat.entertainment": "გართობა",
      "cat.women_link": "ქალი",
      "cat.men_link": "კაცი",
      "page.about": "ჩვენს შესახებ",
      "page.delivery": "მიწოდება",
      "page.return": "დაბრუნება",
      "page.contact": "კონტაქტი",
      "page.login": "შესვლა",
      "page.register": "რეგისტრაცია",
      "page.cart": "კალათა",
      "page.favorites": "რჩეულები",
      "page.orders": "ჩემი შეკვეთები",
      "page.profile": "პროფილი",
      "page.privacy": "კონფიდენციალურობა",
      "page.terms": "გამოყენების პირობები",
      "page.support": "მხარდაჭერა",
      "ui.add_cart": "კალათაში დამატება",
      "ui.buy_now": "ახლა იყიდე",
      "ui.free_ship": "უფასო მიწოდება",
      "ui.empty_cart": "კალათა ცარიელია",
      "ui.empty_fav": "რჩეულები ცარიელია",
      "ui.loading": "იტვირთება...",
      "ui.search_ph": "მოძებნე პროდუქტი, ბრენდი ან კატეგორია...",
      "ui.continue": "გაგრძელება",
      "ui.save": "შენახვა",
      "ui.cancel": "გაუქმება",
      "ui.send": "გაგზავნა",
      "ui.details": "დეტალები",
      "ui.back_home": "მთავარზე დაბრუნება",
    },
    kk: {
      "home.popular": "Танымал тауарлар",
      "home.sale": "Жеңілдікті тауарлар",
      "home.all_products": "Барлық тауарлар",
      "home.categories": "Санаттар",
      "home.view_all": "Барлығын көру",
      "home.sort": "Сұрыптау",
      "home.sort_popular": "Танымал",
      "home.sort_price_asc": "Баға: төменнен жоғары",
      "home.sort_price_desc": "Баға: жоғарыдан төмен",
      "home.scroll_prev": "Артқа жылжыту",
      "home.scroll_next": "Алға жылжыту",
      "home.why_badge": "Неге біз?",
      "home.why_title_1": "Сенім және",
      "home.why_title_2": "ашықтық",
      "home.why_lead": "Таңдалған тауарлар, анық бағалар және әр қадамда қолдау.",
      "home.why_ship": "Жылдам жеткізу",
      "home.why_ship_text": "Тапсырыстарды қысқа мерзімде өңдейміз; икемді жеткізу.",
      "home.why_pay": "Қауіпсіз төлем",
      "home.why_pay_text": "Төлем деректеріңіз қорғалады; ыңғайлы төлем әдістері.",
      "home.why_price": "Қолайлы баға",
      "home.why_price_text": "Науқан мен жеңілдіктермен таңдалған тауарларды ұсынамыз.",
      "home.why_support": "Клиенттерді қолдау",
      "home.why_support_text": "Сұрақтарыңыз үшін командамыз әрдайым жаныңызда.",
      "home.faq": "Жиі қойылатын сұрақтар",
      "home.faq_sub": "Сатып алу, жеткізу және есептік жазба туралы.",
      "home.spin_title": "Айналдыр. Ұт. Қайтала.",
      "home.spin_sub": "Апталық шарттарды орындап, доңғалақты айналдырып жүлде ұтыңыз.",
      "home.spin_btn": "Айналдыру",
      "home.spin_need": "Айналдыру үшін барлық шарттарды орындаңыз",
      "cat.electronics": "Электроника",
      "cat.clothing": "Киім",
      "cat.home_life": "Үй және өмір",
      "cat.accessories": "Аксессуарлар",
      "cat.appliances": "Тұрмыстық техника",
      "cat.laptops": "Ноутбуктер",
      "cat.sport": "Спорт",
      "cat.children": "Балалар",
      "cat.games": "Ойын",
      "cat.entertainment": "Ойын-сауық",
      "cat.women_link": "Әйел",
      "cat.men_link": "Ер",
      "page.about": "Біз туралы",
      "page.delivery": "Жеткізу",
      "page.return": "Қайтару",
      "page.contact": "Байланыс",
      "page.login": "Кіру",
      "page.register": "Тіркелу",
      "page.cart": "Себет",
      "page.favorites": "Таңдаулылар",
      "page.orders": "Тапсырыстарым",
      "page.profile": "Профиль",
      "page.privacy": "Құпиялылық саясаты",
      "page.terms": "Пайдалану шарттары",
      "page.support": "Қолдау",
      "ui.add_cart": "Себетке қосу",
      "ui.buy_now": "Қазір сатып алу",
      "ui.free_ship": "Тегін жеткізу",
      "ui.empty_cart": "Себет бос",
      "ui.empty_fav": "Таңдаулылар бос",
      "ui.loading": "Жүктелуде...",
      "ui.search_ph": "Тауар, бренд немесе санат іздеу...",
      "ui.continue": "Жалғастыру",
      "ui.save": "Сақтау",
      "ui.cancel": "Бас тарту",
      "ui.send": "Жіберу",
      "ui.details": "Толығырақ",
      "ui.back_home": "Басты бетке оралу",
    },
    uz: {
      "home.popular": "Ommabop mahsulotlar",
      "home.sale": "Chegirmali mahsulotlar",
      "home.all_products": "Barcha mahsulotlar",
      "home.categories": "Kategoriyalar",
      "home.view_all": "Hammasini ko‘rish",
      "home.sort": "Saralash",
      "home.sort_popular": "Ommabop",
      "home.sort_price_asc": "Narx: pastdan yuqoriga",
      "home.sort_price_desc": "Narx: yuqoridan pastga",
      "home.scroll_prev": "Orqaga surish",
      "home.scroll_next": "Oldinga surish",
      "home.why_badge": "Nega biz?",
      "home.why_title_1": "Ishonch va",
      "home.why_title_2": "shaffoflik",
      "home.why_lead": "Tanlangan mahsulotlar, aniq narxlar va har qadamda yordam.",
      "home.why_ship": "Tez yetkazib berish",
      "home.why_ship_text": "Buyurtmalarni qisqa muddatda qayta ishlaymiz; moslashuvchan yetkazib berish.",
      "home.why_pay": "Xavfsiz to‘lov",
      "home.why_pay_text": "To‘lov ma’lumotlaringiz himoyalangan; qulay to‘lov usullari.",
      "home.why_price": "Qulay narx",
      "home.why_price_text": "Aksiya va chegirmalar bilan tanlangan mahsulotlarni taklif qilamiz.",
      "home.why_support": "Mijozlarga yordam",
      "home.why_support_text": "Savollaringiz uchun jamoamiz doimo yoningizda.",
      "home.faq": "Ko‘p so‘raladigan savollar",
      "home.faq_sub": "Xarid, yetkazib berish va hisob haqida.",
      "home.spin_title": "Aylantir. Yut. Takrorla.",
      "home.spin_sub": "Haftalik shartlarni bajaring, g‘ildirakni aylantiring va mukofot yuting.",
      "home.spin_btn": "Aylantirish",
      "home.spin_need": "Aylantirish uchun barcha shartlarni bajaring",
      "cat.electronics": "Elektronika",
      "cat.clothing": "Kiyim",
      "cat.home_life": "Uy va hayot",
      "cat.accessories": "Aksessuarlar",
      "cat.appliances": "Maishiy texnika",
      "cat.laptops": "Noutbuklar",
      "cat.sport": "Sport",
      "cat.children": "Bolalar",
      "cat.games": "O‘yin",
      "cat.entertainment": "Ko‘ngilochar",
      "cat.women_link": "Ayol",
      "cat.men_link": "Erkak",
      "page.about": "Biz haqimizda",
      "page.delivery": "Yetkazib berish",
      "page.return": "Qaytarish",
      "page.contact": "Aloqa",
      "page.login": "Kirish",
      "page.register": "Ro‘yxatdan o‘tish",
      "page.cart": "Savat",
      "page.favorites": "Sevimlilar",
      "page.orders": "Buyurtmalarim",
      "page.profile": "Profil",
      "page.privacy": "Maxfiylik siyosati",
      "page.terms": "Foydalanish shartlari",
      "page.support": "Yordam",
      "ui.add_cart": "Savatga qo‘shish",
      "ui.buy_now": "Hozir sotib olish",
      "ui.free_ship": "Bepul yetkazib berish",
      "ui.empty_cart": "Savat bo‘sh",
      "ui.empty_fav": "Sevimlilar bo‘sh",
      "ui.loading": "Yuklanmoqda...",
      "ui.search_ph": "Mahsulot, brend yoki kategoriya qidirish...",
      "ui.continue": "Davom etish",
      "ui.save": "Saqlash",
      "ui.cancel": "Bekor qilish",
      "ui.send": "Yuborish",
      "ui.details": "Batafsil",
      "ui.back_home": "Bosh sahifaga qaytish",
    },
    ar: {
      "home.popular": "المنتجات الشائعة",
      "home.sale": "منتجات مخفّضة",
      "home.all_products": "كل المنتجات",
      "home.categories": "الفئات",
      "home.view_all": "عرض الكل",
      "home.sort": "ترتيب",
      "home.sort_popular": "شائع",
      "home.sort_price_asc": "السعر: من الأقل للأعلى",
      "home.sort_price_desc": "السعر: من الأعلى للأقل",
      "home.scroll_prev": "تمرير للخلف",
      "home.scroll_next": "تمرير للأمام",
      "home.why_badge": "لماذا نحن؟",
      "home.why_title_1": "الثقة و",
      "home.why_title_2": "الشفافية",
      "home.why_lead": "منتجات مختارة وأسعار واضحة ودعم في كل خطوة.",
      "home.why_ship": "توصيل سريع",
      "home.why_ship_text": "نعالج طلباتك بسرعة مع خيارات توصيل مرنة.",
      "home.why_pay": "دفع آمن",
      "home.why_pay_text": "معلومات الدفع محمية؛ ادفع بسهولة عبر الوسائل المعروفة.",
      "home.why_price": "سعر مناسب",
      "home.why_price_text": "نقدم منتجات مختارة بعروض وتخفيضات.",
      "home.why_support": "دعم العملاء",
      "home.why_support_text": "فريقنا دائماً معك للإجابة عن أسئلتك.",
      "home.faq": "الأسئلة الشائعة",
      "home.faq_sub": "حول التسوق والتوصيل والحساب.",
      "home.spin_title": "أدر. اربح. كرر.",
      "home.spin_sub": "أكمل الشروط الأسبوعية وأدر العجلة واربح مكافآت.",
      "home.spin_btn": "أدر",
      "home.spin_need": "أكمل كل الشروط للدوران",
      "cat.electronics": "إلكترونيات",
      "cat.clothing": "ملابس",
      "cat.home_life": "المنزل والحياة",
      "cat.accessories": "إكسسوارات",
      "cat.appliances": "أجهزة منزلية",
      "cat.laptops": "حواسيب محمولة",
      "cat.sport": "رياضة",
      "cat.children": "أطفال",
      "cat.games": "ألعاب",
      "cat.entertainment": "ترفيه",
      "cat.women_link": "نساء",
      "cat.men_link": "رجال",
      "page.about": "من نحن",
      "page.delivery": "التوصيل",
      "page.return": "الإرجاع",
      "page.contact": "تواصل",
      "page.login": "دخول",
      "page.register": "تسجيل",
      "page.cart": "السلة",
      "page.favorites": "المفضلة",
      "page.orders": "طلباتي",
      "page.profile": "الملف",
      "page.privacy": "سياسة الخصوصية",
      "page.terms": "شروط الاستخدام",
      "page.support": "الدعم",
      "ui.add_cart": "أضف إلى السلة",
      "ui.buy_now": "اشترِ الآن",
      "ui.free_ship": "توصيل مجاني",
      "ui.empty_cart": "سلتك فارغة",
      "ui.empty_fav": "قائمة المفضلة فارغة",
      "ui.loading": "جارٍ التحميل...",
      "ui.search_ph": "ابحث عن منتج أو علامة أو فئة...",
      "ui.continue": "متابعة",
      "ui.save": "حفظ",
      "ui.cancel": "إلغاء",
      "ui.send": "إرسال",
      "ui.details": "التفاصيل",
      "ui.back_home": "العودة للرئيسية",
    },
    en: {
      "home.popular": "Popular products",
      "home.sale": "Sale products",
      "home.all_products": "All products",
      "home.categories": "Categories",
      "home.view_all": "View all",
      "home.sort": "Sort",
      "home.sort_popular": "Popular",
      "home.sort_price_asc": "Price: low to high",
      "home.sort_price_desc": "Price: high to low",
      "home.scroll_prev": "Scroll back",
      "home.scroll_next": "Scroll forward",
      "home.why_badge": "Why us?",
      "home.why_title_1": "Trust and",
      "home.why_title_2": "transparency",
      "home.why_lead": "Selected products, clear prices and support at every step — we simplify shopping.",
      "home.why_ship": "Fast delivery",
      "home.why_ship_text": "We process your orders quickly with flexible delivery options.",
      "home.why_pay": "Secure payment",
      "home.why_pay_text": "Your payment details are protected; pay easily with trusted methods.",
      "home.why_price": "Great prices",
      "home.why_price_text": "We offer selected products with campaigns and discounts.",
      "home.why_support": "Customer support",
      "home.why_support_text": "Our team is always here for your questions.",
      "home.faq": "Frequently asked questions",
      "home.faq_sub": "Most asked questions about shopping, delivery and accounts.",
      "home.spin_title": "Spin. Win. Repeat.",
      "home.spin_sub": "Complete weekly goals, spin the wheel and win premium discounts, coupons and bonus balance.",
      "home.spin_btn": "Spin",
      "home.spin_need": "Complete all goals to spin",
      "cat.electronics": "Electronics",
      "cat.clothing": "Clothing",
      "cat.home_life": "Home & living",
      "cat.accessories": "Accessories",
      "cat.appliances": "Appliances",
      "cat.laptops": "Laptops",
      "cat.sport": "Sports",
      "cat.children": "Kids",
      "cat.games": "Games",
      "cat.entertainment": "Entertainment",
      "cat.women_link": "Women",
      "cat.men_link": "Men",
      "page.about": "About",
      "page.delivery": "Delivery",
      "page.return": "Returns",
      "page.contact": "Contact",
      "page.login": "Log in",
      "page.register": "Sign up",
      "page.cart": "Cart",
      "page.favorites": "Favorites",
      "page.orders": "My orders",
      "page.profile": "Profile",
      "page.privacy": "Privacy policy",
      "page.terms": "Terms of use",
      "page.support": "Support",
      "ui.add_cart": "Add to cart",
      "ui.buy_now": "Buy now",
      "ui.free_ship": "Free shipping",
      "ui.empty_cart": "Your cart is empty",
      "ui.empty_fav": "Favorites list is empty",
      "ui.loading": "Loading...",
      "ui.search_ph": "Search product, brand or category...",
      "ui.continue": "Continue",
      "ui.save": "Save",
      "ui.cancel": "Cancel",
      "ui.send": "Send",
      "ui.details": "Details",
      "ui.back_home": "Back to home",
    },
  };

  Object.keys(PAGE).forEach(function (lang) {
    if (!DICT[lang]) DICT[lang] = {};
    Object.keys(PAGE[lang]).forEach(function (k) {
      DICT[lang][k] = PAGE[lang][k];
    });
  });

  var currentLang = DEFAULT_LANG;
  var reverseIndex = null;
  var observer = null;
  var applying = false;

  function normalize(code) {
    var c = String(code || "").toLowerCase().trim();
    for (var i = 0; i < LANGUAGES.length; i++) {
      if (LANGUAGES[i].code === c) return c;
    }
    return DEFAULT_LANG;
  }

  function getLangMeta(code) {
    var c = normalize(code);
    for (var i = 0; i < LANGUAGES.length; i++) {
      if (LANGUAGES[i].code === c) return LANGUAGES[i];
    }
    return LANGUAGES[0];
  }

  function t(key, lang) {
    var l = normalize(lang || currentLang);
    var pack = DICT[l] || DICT[DEFAULT_LANG];
    if (pack[key] != null) return pack[key];
    if (DICT[DEFAULT_LANG][key] != null) return DICT[DEFAULT_LANG][key];
    return key;
  }

  function langFromCountry(countryCode) {
    var code = String(countryCode || "").toUpperCase();
    return COUNTRY_LANG[code] || DEFAULT_LANG;
  }

  function ensureFonts(lang) {
    var id = "buykon-i18n-font-" + lang;
    if (document.getElementById(id)) return;
    var href = "";
    if (lang === "zh") {
      href =
        "https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@400;500;600;700&display=swap";
    } else if (lang === "ka") {
      href =
        "https://fonts.googleapis.com/css2?family=Noto+Sans+Georgian:wght@400;500;600;700&display=swap";
    } else if (lang === "ar") {
      href =
        "https://fonts.googleapis.com/css2?family=Noto+Sans+Arabic:wght@400;500;600;700&display=swap";
    } else if (lang === "kk" || lang === "uz") {
      href =
        "https://fonts.googleapis.com/css2?family=Noto+Sans:wght@400;500;600;700&display=swap";
    }
    if (!href) return;
    var link = document.createElement("link");
    link.id = id;
    link.rel = "stylesheet";
    link.href = href;
    document.head.appendChild(link);
  }

  function applyDocumentLang(lang) {
    var meta = getLangMeta(lang);
    document.documentElement.lang = meta.code;
    document.documentElement.dir = meta.rtl ? "rtl" : "ltr";
    document.body.classList.toggle("is-rtl", !!meta.rtl);
    document.body.setAttribute("data-lang", meta.code);
    ensureFonts(meta.code);
  }

  function applyNode(el) {
    if (!el || el.nodeType !== 1) return;
    var key = el.getAttribute("data-i18n");
    if (key) {
      var attr = el.getAttribute("data-i18n-attr");
      var val = t(key);
      if (attr) {
        attr.split(",").forEach(function (a) {
          a = a.trim();
          if (a) el.setAttribute(a, val);
        });
      } else {
        el.textContent = val;
      }
    }
    var htmlKey = el.getAttribute("data-i18n-html");
    if (htmlKey) el.innerHTML = t(htmlKey);
  }

  function normText(s) {
    return String(s || "")
      .replace(/\u00a0/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function rebuildReverseIndex() {
    reverseIndex = Object.create(null);
    Object.keys(DICT).forEach(function (lang) {
      var pack = DICT[lang] || {};
      Object.keys(pack).forEach(function (key) {
        var val = normText(pack[key]);
        if (val && val.length >= 2) reverseIndex[val] = key;
      });
    });
  }

  function lookupKey(text) {
    if (!reverseIndex) rebuildReverseIndex();
    return reverseIndex[normText(text)] || null;
  }

  function isManagedText(text) {
    var n = normText(text);
    if (!n) return false;
    if (lookupKey(n)) return true;
    var pack = DICT[currentLang] || {};
    for (var k in pack) {
      if (Object.prototype.hasOwnProperty.call(pack, k) && normText(pack[k]) === n) {
        return true;
      }
    }
    return false;
  }

  function shouldSkipEl(el) {
    if (!el || el.nodeType !== 1) return true;
    var tag = el.tagName;
    if (
      tag === "SCRIPT" ||
      tag === "STYLE" ||
      tag === "NOSCRIPT" ||
      tag === "TEXTAREA" ||
      tag === "CODE" ||
      tag === "PRE" ||
      tag === "SVG" ||
      tag === "PATH"
    ) {
      return true;
    }
    if (el.closest && el.closest("[data-lang-switch], .lang-switch, [contenteditable='true']")) {
      return true;
    }
    return false;
  }

  function translateTextNodes(root) {
    if (!root) return;
    if (!translateTextNodes._orig) translateTextNodes._orig = new WeakMap();
    var origMap = translateTextNodes._orig;

    var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode: function (node) {
        if (!node || !node.nodeValue || !normText(node.nodeValue)) {
          return NodeFilter.FILTER_REJECT;
        }
        var parent = node.parentElement;
        if (shouldSkipEl(parent)) return NodeFilter.FILTER_REJECT;
        if (parent && parent.getAttribute && parent.getAttribute("data-i18n")) {
          return NodeFilter.FILTER_REJECT;
        }
        if (parent && parent.closest && parent.closest("[data-ai-product-name]")) {
          return NodeFilter.FILTER_REJECT;
        }
        return NodeFilter.FILTER_ACCEPT;
      },
    });

    var nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);

    nodes.forEach(function (node) {
      var raw = node.nodeValue;
      var trimmed = normText(raw);
      var src = origMap.get(node);
      if (!src) {
        src = trimmed;
        origMap.set(node, src);
      }
      var key = lookupKey(src);
      if (!key) return;
      var translated = currentLang === DEFAULT_LANG ? src : t(key);
      if (!translated) return;
      var lead = raw.match(/^\s*/)[0] || "";
      var trail = raw.match(/\s*$/)[0] || "";
      node.nodeValue = lead + translated + trail;
    });
  }

  function translateAttributes(root) {
    if (!root || !root.querySelectorAll) return;
    if (!translateAttributes._orig) translateAttributes._orig = new WeakMap();
    var origMap = translateAttributes._orig;
    var attrs = ["placeholder", "aria-label", "title", "alt"];
    root.querySelectorAll("*").forEach(function (el) {
      if (shouldSkipEl(el)) return;
      attrs.forEach(function (name) {
        if (!el.hasAttribute(name)) return;
        if (el.getAttribute("data-i18n-attr") && el.getAttribute("data-i18n-attr").indexOf(name) !== -1) {
          return;
        }
        var val = el.getAttribute(name);
        var bag = origMap.get(el);
        if (!bag) {
          bag = Object.create(null);
          origMap.set(el, bag);
        }
        if (!bag[name]) bag[name] = val;
        var src = bag[name];
        var key = lookupKey(src);
        if (!key) return;
        el.setAttribute(name, currentLang === DEFAULT_LANG ? src : t(key));
      });
    });
  }

  function apply(root) {
    if (applying) return;
    applying = true;
    try {
      var scope = root || document;
      var nodes = scope.querySelectorAll
        ? scope.querySelectorAll("[data-i18n], [data-i18n-html]")
        : [];
      for (var i = 0; i < nodes.length; i++) applyNode(nodes[i]);

      var marqueeRoot = scope.querySelector
        ? scope.querySelector(".site-alert-marquee") || scope
        : scope;
      var marqueeItems =
        marqueeRoot.querySelectorAll
          ? marqueeRoot.querySelectorAll(".site-alert-marquee__item")
          : [];
      for (var m = 0; m < marqueeItems.length; m++) {
        var txt = t("marquee.test");
        marqueeItems[m].innerHTML =
          '<i class="site-alert-marquee__dot" aria-hidden="true"></i>' + txt;
      }
      var vh =
        marqueeRoot.querySelector &&
        marqueeRoot.querySelector(".site-alert-marquee .visually-hidden");
      if (vh) vh.textContent = t("marquee.test");

      translateTextNodes(scope.body || scope);
      translateAttributes(scope.body || scope);
    } finally {
      applying = false;
    }
  }

  function positionMenu(wrap) {
    var btn = wrap.querySelector(".lang-switch__btn");
    var menu = wrap.querySelector(".lang-switch__menu");
    if (!btn || !menu) return;
    var rect = btn.getBoundingClientRect();
    var width = Math.min(280, window.innerWidth - 24);
    var left = rect.left;
    if (document.documentElement.dir === "rtl") {
      left = rect.right - width;
    }
    if (left + width > window.innerWidth - 12) left = window.innerWidth - width - 12;
    if (left < 12) left = 12;
    var top = rect.bottom + 8;
    var maxH = Math.min(window.innerHeight * 0.7, 420);
    if (top + Math.min(maxH, 280) > window.innerHeight - 8) {
      top = Math.max(8, rect.top - 8 - Math.min(maxH, 280));
    }
    menu.style.position = "fixed";
    menu.style.top = Math.round(top) + "px";
    menu.style.left = Math.round(left) + "px";
    menu.style.right = "auto";
    menu.style.width = width + "px";
    menu.style.zIndex = "400000";
  }

  function setLang(code, opts) {
    opts = opts || {};
    var next = normalize(code);
    var prev = currentLang;
    currentLang = next;
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch (e) {
      /* ignore */
    }
    applyDocumentLang(next);
    apply(document);
    syncSwitchers();
    if (!opts.silent || prev !== next) {
      document.dispatchEvent(
        new CustomEvent("BuykonLangChanged", {
          detail: { lang: next, prev: prev, fromCountry: !!opts.fromCountry },
        })
      );
    }
    return next;
  }

  function getLang() {
    return currentLang;
  }

  function readStored() {
    try {
      return normalize(localStorage.getItem(STORAGE_KEY) || "");
    } catch (e) {
      return DEFAULT_LANG;
    }
  }

  function flagUrl(code) {
    return "https://flagcdn.com/w20/" + String(code || "az").toLowerCase() + ".png";
  }

  function buildSwitcherHtml(idPrefix) {
    var meta = getLangMeta(currentLang);
    var prefix = idPrefix || "lang";
    var options = LANGUAGES.map(function (l) {
      return (
        '<button type="button" class="lang-switch__option' +
        (l.code === meta.code ? " is-active" : "") +
        '" role="option" data-lang-set="' +
        l.code +
        '" aria-selected="' +
        (l.code === meta.code ? "true" : "false") +
        '">' +
        '<img src="' +
        flagUrl(l.flag) +
        '" alt="" width="18" height="12" loading="lazy" />' +
        '<span class="lang-switch__native">' +
        l.native +
        "</span>" +
        '<span class="lang-switch__short">' +
        l.short +
        "</span>" +
        "</button>"
      );
    }).join("");

    return (
      '<div class="lang-switch" data-lang-switch="' +
      prefix +
      '">' +
      '<button type="button" class="lang-switch__btn" id="' +
      prefix +
      '-toggle" aria-haspopup="listbox" aria-expanded="false" aria-label="' +
      t("lang.choose") +
      '">' +
      '<img class="lang-switch__flag" src="' +
      flagUrl(meta.flag) +
      '" alt="" width="18" height="12" />' +
      '<span class="lang-switch__code">' +
      meta.short +
      "</span>" +
      '<svg class="lang-switch__chevron" width="10" height="10" viewBox="0 0 12 12" fill="none" aria-hidden="true"><path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>' +
      "</button>" +
      '<div class="lang-switch__menu" id="' +
      prefix +
      '-menu" role="listbox" hidden>' +
      '<p class="lang-switch__title">' +
      t("lang.choose") +
      "</p>" +
      options +
      "</div></div>"
    );
  }

  function syncSwitchers() {
    document.querySelectorAll("[data-lang-switch]").forEach(function (wrap) {
      var meta = getLangMeta(currentLang);
      var flag = wrap.querySelector(".lang-switch__flag");
      var code = wrap.querySelector(".lang-switch__code");
      var btn = wrap.querySelector(".lang-switch__btn");
      var title = wrap.querySelector(".lang-switch__title");
      if (flag) flag.src = flagUrl(meta.flag);
      if (code) code.textContent = meta.short;
      if (btn) btn.setAttribute("aria-label", t("lang.choose"));
      if (title) title.textContent = t("lang.choose");
      wrap.querySelectorAll("[data-lang-set]").forEach(function (opt) {
        var active = opt.getAttribute("data-lang-set") === meta.code;
        opt.classList.toggle("is-active", active);
        opt.setAttribute("aria-selected", active ? "true" : "false");
      });
    });
  }

  function closeAllMenus(except) {
    document.querySelectorAll("[data-lang-switch]").forEach(function (wrap) {
      if (except && wrap === except) return;
      var menu = wrap.querySelector(".lang-switch__menu");
      var btn = wrap.querySelector(".lang-switch__btn");
      if (menu) menu.setAttribute("hidden", "");
      if (btn) btn.setAttribute("aria-expanded", "false");
      wrap.classList.remove("is-open");
    });
  }

  function bindSwitcher(root) {
    var scope = root || document;
    scope.querySelectorAll("[data-lang-switch]").forEach(function (wrap) {
      if (wrap.dataset.bound) return;
      wrap.dataset.bound = "1";
      var btn = wrap.querySelector(".lang-switch__btn");
      var menu = wrap.querySelector(".lang-switch__menu");
      if (!btn || !menu) return;

      btn.addEventListener("click", function (e) {
        e.preventDefault();
        e.stopPropagation();
        var open = !wrap.classList.contains("is-open");
        closeAllMenus();
        if (open) {
          wrap.classList.add("is-open");
          menu.removeAttribute("hidden");
          btn.setAttribute("aria-expanded", "true");
          positionMenu(wrap);
        }
      });

      wrap.addEventListener("click", function (e) {
        var opt = e.target.closest("[data-lang-set]");
        if (!opt) return;
        e.preventDefault();
        e.stopPropagation();
        setLang(opt.getAttribute("data-lang-set"));
        closeAllMenus();
      });
    });
  }

  function mountDesktop(container) {
    if (!container) return;
    if (container.querySelector("[data-lang-switch]")) return;
    container.insertAdjacentHTML("afterbegin", buildSwitcherHtml("lang-desktop"));
    bindSwitcher(container);
  }

  function mountMobileBar(container) {
    if (!container) return;
    if (container.querySelector("[data-lang-switch='lang-mobile']")) return;
    container.insertAdjacentHTML("afterbegin", buildSwitcherHtml("lang-mobile"));
    bindSwitcher(container);
  }

  function mountMobileMenu(container) {
    if (!container) return;
    var existing = container.querySelector("[data-lang-switch='lang-sheet']");
    if (existing) existing.parentNode.removeChild(existing);
    var html =
      '<div class="mobile-menu__lang">' +
      buildSwitcherHtml("lang-sheet") +
      "</div>";
    container.insertAdjacentHTML("afterbegin", html);
    bindSwitcher(container);
  }

  function startObserver() {
    if (observer || typeof MutationObserver === "undefined") return;
    observer = new MutationObserver(function (mutations) {
      if (applying) return;
      var needs = false;
      for (var i = 0; i < mutations.length; i++) {
        if (mutations[i].addedNodes && mutations[i].addedNodes.length) {
          needs = true;
          break;
        }
      }
      if (!needs) return;
      if (startObserver._timer) clearTimeout(startObserver._timer);
      startObserver._timer = setTimeout(function () {
        apply(document);
      }, 80);
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  function init() {
    var stored = null;
    try {
      stored = localStorage.getItem(STORAGE_KEY);
    } catch (e) {
      stored = null;
    }
    if (stored) {
      currentLang = normalize(stored);
    } else {
      try {
        var country = JSON.parse(localStorage.getItem("buykon_country") || "null");
        if (country && country.code) {
          currentLang = langFromCountry(country.code);
          localStorage.setItem(STORAGE_KEY, currentLang);
        } else {
          currentLang = DEFAULT_LANG;
        }
      } catch (e2) {
        currentLang = DEFAULT_LANG;
      }
    }
    rebuildReverseIndex();
    applyDocumentLang(currentLang);
    apply(document);
    bindSwitcher(document);
    startObserver();

    if (!document.documentElement.dataset.langClickBound) {
      document.documentElement.dataset.langClickBound = "1";
      document.addEventListener("click", function () {
        closeAllMenus();
      });
      document.addEventListener("keydown", function (e) {
        if (e.key === "Escape") closeAllMenus();
      });
      window.addEventListener("resize", function () {
        document.querySelectorAll(".lang-switch.is-open").forEach(positionMenu);
      });
      window.addEventListener("scroll", function () {
        document.querySelectorAll(".lang-switch.is-open").forEach(positionMenu);
      }, true);
    }

    document.addEventListener("BuykonOnboardingDone", function (e) {
      var country = e.detail && e.detail.country;
      if (!country || !country.code) return;
      var mapped = langFromCountry(country.code);
      if (mapped) setLang(mapped, { fromCountry: true });
    });

    document.addEventListener("BizdevarLayoutLoaded", function () {
      apply(document);
      bindSwitcher(document);
    });
  }

  global.BuykonI18n = {
    LANGUAGES: LANGUAGES,
    STORAGE_KEY: STORAGE_KEY,
    t: t,
    getLang: getLang,
    setLang: setLang,
    langFromCountry: langFromCountry,
    apply: apply,
    isManagedText: isManagedText,
    buildSwitcherHtml: buildSwitcherHtml,
    mountDesktop: mountDesktop,
    mountMobileBar: mountMobileBar,
    mountMobileMenu: mountMobileMenu,
    bindSwitcher: bindSwitcher,
    syncSwitchers: syncSwitchers,
    getLangMeta: getLangMeta,
    init: init,
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})(window);
