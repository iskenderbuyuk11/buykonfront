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

  var currentLang = DEFAULT_LANG;

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

  function apply(root) {
    var scope = root || document;
    var nodes = scope.querySelectorAll("[data-i18n], [data-i18n-html]");
    for (var i = 0; i < nodes.length; i++) applyNode(nodes[i]);
    // marquee duplicated spans
    var marqueeItems = scope.querySelectorAll(".site-alert-marquee__item");
    for (var m = 0; m < marqueeItems.length; m++) {
      var txt = t("marquee.test");
      marqueeItems[m].innerHTML =
        '<i class="site-alert-marquee__dot" aria-hidden="true"></i>' + txt;
    }
    var vh = scope.querySelector(".site-alert-marquee .visually-hidden");
    if (vh) vh.textContent = t("marquee.test");
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
        e.stopPropagation();
        var open = !wrap.classList.contains("is-open");
        closeAllMenus();
        if (open) {
          wrap.classList.add("is-open");
          menu.removeAttribute("hidden");
          btn.setAttribute("aria-expanded", "true");
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
      // Ölkə seçilibsə, dilini oradan götür
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
    applyDocumentLang(currentLang);
    apply(document);
    bindSwitcher(document);

    if (!document.documentElement.dataset.langClickBound) {
      document.documentElement.dataset.langClickBound = "1";
      document.addEventListener("click", function () {
        closeAllMenus();
      });
      document.addEventListener("keydown", function (e) {
        if (e.key === "Escape") closeAllMenus();
      });
    }

    document.addEventListener("BuykonOnboardingDone", function (e) {
      var country = e.detail && e.detail.country;
      if (!country || !country.code) return;
      var mapped = langFromCountry(country.code);
      if (mapped) setLang(mapped, { fromCountry: true });
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
