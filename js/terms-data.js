/**
 * Buykon — İstifadəçi Müqaviləsi (İstifadə Şərtləri)
 * Admin panel və public səhifə eyni default strukturdan istifadə edir.
 */
(function (global) {
  "use strict";

  var STORAGE_KEY = "buykon_terms_of_use_v1";
  var SETTING_KEY = "terms_of_use";

  var DEFAULT = {
    updated_at: "21 iyul 2026",
    title: "Buykon İstifadəçi Müqaviləsi (İstifadə Şərtləri)",
    intro:
      "Bu İstifadəçi Müqaviləsi (\"Müqavilə\") Buykon platformasından (\"Platforma\", \"Buykon\", \"biz\") istifadə edən bütün fiziki və hüquqi şəxslər (\"İstifadəçi\", \"siz\") üçün hüquqi cəhətdən məcburi şərtləri müəyyən edir.\n\nPlatformada qeydiyyatdan keçməklə, daxil olmaqla və ya hər hansı xidmətimizdən istifadə etməklə bu Müqaviləni tam oxuduğunuzu, başa düşdüyünüzü və qəbul etdiyinizi təsdiq edirsiniz.",
    sections: [
      {
        id: "platforma",
        title: "1. Platforma haqqında",
        paragraphs: [
          "Buykon müstəqil satıcılar ilə alıcıları bir araya gətirən elektron ticarət marketplace platformasıdır.",
          "Buykon məhsulların istehsalçısı, idxalçısı və ya birbaşa satıcısı deyil (Buykon tərəfindən ayrıca satılan məhsullar istisna olmaqla). Platformada yerləşdirilən məhsulların əksəriyyəti müstəqil satıcılara məxsusdur."
        ],
        bullets: []
      },
      {
        id: "qeydiyyat",
        title: "2. Qeydiyyat və Hesab",
        paragraphs: ["İstifadəçi:"],
        bullets: [
          "yalnız doğru və aktual məlumat təqdim etməlidir;",
          "hesab məlumatlarının məxfiliyini qorumağa borcludur;",
          "hesabı üçüncü şəxslərə verməməlidir;",
          "hesabında baş verən bütün fəaliyyətlərə görə məsuliyyət daşıyır."
        ],
        after: [
          "Buykon istənilən vaxt şəxsiyyətin təsdiqini tələb edə bilər.",
          "Saxta hesabların yaradılması, avtomatlaşdırılmış qeydiyyat, botlardan istifadə və ya sistemdən sui-istifadə qadağandır."
        ]
      },
      {
        id: "qaydalar",
        title: "3. Platformadan İstifadə Qaydaları",
        paragraphs: ["İstifadəçi aşağıdakı hərəkətləri etməyəcəyini qəbul edir:"],
        bullets: [
          "qanunsuz fəaliyyət göstərmək;",
          "saxta sifariş vermək;",
          "ödəniş fırıldaqları etmək;",
          "digər istifadəçiləri aldatmaq;",
          "nifrət nitqi yaymaq;",
          "virus və zərərli proqram göndərmək;",
          "sistemə icazəsiz müdaxilə etmək;",
          "platformanın normal fəaliyyətini pozmaq;",
          "müəllif hüquqlarını pozmaq;",
          "başqasının hesabından istifadə etmək."
        ],
        after: [
          "Bu qaydaların pozulması hesabın xəbərdarlıq edilmədən məhdudlaşdırılması və ya bağlanması ilə nəticələnə bilər."
        ]
      },
      {
        id: "saticilar",
        title: "4. Satıcılar",
        paragraphs: ["Marketplace-də fəaliyyət göstərən satıcılar təqdim etdikləri:"],
        bullets: [
          "məhsul məlumatına,",
          "qiymətlərə,",
          "stok vəziyyətinə,",
          "zəmanətə,",
          "məhsulun qanuniliyinə,",
          "çatdırılmasına"
        ],
        after: [
          "tam məsuliyyət daşıyırlar.",
          "Buykon satıcı məlumatlarının düzgünlüyünə zəmanət vermir."
        ]
      },
      {
        id: "mehsullar",
        title: "5. Məhsullar",
        paragraphs: [
          "Platformada satılması qanunla qadağan olunan məhsulların yerləşdirilməsi qəti qadağandır.",
          "Buykon istənilən məhsulu əvvəlcədən xəbərdarlıq etmədən silmək, gizlətmək və ya satışını dayandırmaq hüququnu özündə saxlayır."
        ],
        bullets: []
      },
      {
        id: "sifarisler",
        title: "6. Sifarişlər",
        paragraphs: [
          "Sifariş yalnız sistem tərəfindən təsdiq edildikdən sonra qüvvəyə minir.",
          "Aşağıdakı hallarda Buykon sifarişi ləğv edə bilər:"
        ],
        bullets: [
          "texniki xəta;",
          "yanlış qiymət;",
          "stokun bitməsi;",
          "təhlükəsizlik riski;",
          "ödəniş fırıldağı şübhəsi;",
          "qanun pozuntusu."
        ]
      },
      {
        id: "qiymetler",
        title: "7. Qiymətlər",
        paragraphs: [
          "Platformadakı qiymətlər əvvəlcədən xəbərdarlıq edilmədən dəyişdirilə bilər.",
          "Texniki nasazlıq nəticəsində açıq şəkildə səhv göstərilən qiymətlər hüquqi öhdəlik yaratmır."
        ],
        bullets: []
      },
      {
        id: "odenisler",
        title: "8. Ödənişlər",
        paragraphs: [
          "Ödənişlər platformanın dəstəklədiyi təhlükəsiz ödəniş sistemləri vasitəsilə həyata keçirilir.",
          "Buykon bankların, ödəniş provayderlərinin və ya üçüncü tərəf xidmətlərinin fəaliyyətinə görə məsuliyyət daşımır."
        ],
        bullets: []
      },
      {
        id: "catdirilma",
        title: "9. Çatdırılma",
        paragraphs: ["Çatdırılma müddəti aşağıdakı amillərdən asılı olaraq dəyişə bilər:"],
        bullets: [
          "satıcı;",
          "logistika şirkəti;",
          "ünvan;",
          "hava şəraiti;",
          "gömrük prosedurları."
        ],
        after: ["Buykon fors-major hallarında yaranan gecikmələrə görə məsuliyyət daşımır."]
      },
      {
        id: "qaytarma",
        title: "10. Geri Qaytarma",
        paragraphs: [
          "Məhsulun qaytarılması və ya dəyişdirilməsi Azərbaycan Respublikasının qanunvericiliyinə və satıcının qaytarma siyasətinə uyğun həyata keçirilir.",
          "Gigiyenik, fərdiləşdirilmiş və qanunvericiliklə qaytarılması məhdudlaşdırılmış məhsullar geri qaytarılmaya bilər."
        ],
        bullets: []
      },
      {
        id: "bonuslar",
        title: "11. Bonuslar və Kampaniyalar",
        paragraphs: ["Buykon aşağıdakıları istənilən vaxt dəyişdirmək, dayandırmaq və ya ləğv etmək hüququna malikdir:"],
        bullets: [
          "bonusları;",
          "kuponları;",
          "cashback proqramlarını;",
          "promosyonları."
        ],
        after: ["Sui-istifadə hallarında bonuslar geri alına və hesab məhdudlaşdırıla bilər."]
      },
      {
        id: "eqli",
        title: "12. Əqli Mülkiyyət",
        paragraphs: ["Buykon platformasının aşağıdakı elementləri Azərbaycan Respublikasının və beynəlxalq müəllif hüquqları qanunvericiliyi ilə qorunur:"],
        bullets: [
          "proqram təminatı;",
          "dizaynı;",
          "loqosu;",
          "mətnləri;",
          "qrafikləri;",
          "şəkilləri;",
          "videoları;",
          "bazası."
        ],
        after: ["Yazılı icazə olmadan onların istifadə olunması qadağandır."]
      },
      {
        id: "hesab-dayandirma",
        title: "13. Hesabın Dayandırılması",
        paragraphs: ["Buykon əvvəlcədən xəbərdarlıq etmədən istifadəçi hesabını məhdudlaşdıra və ya bağlaya bilər, əgər:"],
        bullets: [
          "bu Müqavilə pozulursa;",
          "saxtakarlıq aşkar edilirsə;",
          "hüquq-mühafizə orqanlarının sorğusu olarsa;",
          "platformanın təhlükəsizliyi risk altına düşərsə."
        ]
      },
      {
        id: "mesuliyyet",
        title: "14. Məsuliyyətin Məhdudlaşdırılması",
        paragraphs: [
          "Qanunvericilikdə nəzərdə tutulmuş hallar istisna olmaqla, Buykon aşağıdakılara görə məsuliyyət daşımır:"
        ],
        bullets: [
          "dolayı zərərlər;",
          "itirilmiş gəlirlər;",
          "məlumat itkisi;",
          "internet nasazlıqları;",
          "server problemləri;",
          "üçüncü tərəf xidmətlərinin dayanması;",
          "satıcı ilə alıcı arasında yaranan mübahisələr."
        ]
      },
      {
        id: "mexfilik",
        title: "15. Məxfilik",
        paragraphs: [
          "Şəxsi məlumatlar ayrıca Məxfilik Siyasəti əsasında emal edilir.",
          "Platformadan istifadə etməklə həmin siyasəti qəbul etmiş sayılırsınız."
        ],
        bullets: []
      },
      {
        id: "deyisiklik",
        title: "16. Müqaviləyə Dəyişiklik",
        paragraphs: [
          "Buykon bu Müqaviləni istənilən vaxt yeniləyə bilər.",
          "Yenilənmiş versiya Platformada dərc edildiyi tarixdən qüvvəyə minir.",
          "Platformadan istifadəni davam etdirməyiniz dəyişikliklərin qəbul edilməsi hesab olunur."
        ],
        bullets: []
      },
      {
        id: "huquq",
        title: "17. Tətbiq Olunan Hüquq",
        paragraphs: [
          "Bu Müqavilə Azərbaycan Respublikasının qanunvericiliyinə uyğun tənzimlənir.",
          "Mübahisələr Azərbaycan Respublikasının səlahiyyətli məhkəmələrində və qanunvericilikdə nəzərdə tutulmuş digər qaydada həll edilir."
        ],
        bullets: []
      },
      {
        id: "elaqe",
        title: "18. Əlaqə",
        paragraphs: [
          "İstifadəçi bu Müqavilə ilə bağlı suallarını Buykon-un rəsmi dəstək xidməti vasitəsilə göndərə bilər."
        ],
        bullets: []
      }
    ]
  };

  function clone(obj) {
    return JSON.parse(JSON.stringify(obj));
  }

  function slugify(title, index) {
    var base = String(title || "")
      .toLowerCase()
      .replace(/^\d+[\.\)]\s*/, "")
      .replace(/[^a-z0-9əğıöüçş\- ]+/gi, "")
      .trim()
      .replace(/\s+/g, "-")
      .slice(0, 40);
    return base || ("bolme-" + (index + 1));
  }

  function normalizeSection(sec, index) {
    sec = sec || {};
    return {
      id: String(sec.id || slugify(sec.title, index) || "bolme-" + (index + 1)),
      title: String(sec.title || ("Bölmə " + (index + 1))).trim(),
      paragraphs: Array.isArray(sec.paragraphs)
        ? sec.paragraphs.map(function (p) { return String(p || "").trim(); }).filter(Boolean)
        : (sec.body ? [String(sec.body)] : []),
      bullets: Array.isArray(sec.bullets)
        ? sec.bullets.map(function (b) { return String(b || "").trim(); }).filter(Boolean)
        : [],
      after: Array.isArray(sec.after)
        ? sec.after.map(function (p) { return String(p || "").trim(); }).filter(Boolean)
        : []
    };
  }

  function normalize(data) {
    if (!data || typeof data !== "object") return clone(DEFAULT);
    var sections = Array.isArray(data.sections) ? data.sections : [];
    return {
      updated_at: String(data.updated_at || DEFAULT.updated_at).trim() || DEFAULT.updated_at,
      title: String(data.title || DEFAULT.title).trim() || DEFAULT.title,
      intro: String(data.intro != null ? data.intro : DEFAULT.intro),
      sections: sections.map(normalizeSection)
    };
  }

  function parseMaybeJson(value) {
    if (value == null) return null;
    if (typeof value === "object") return value;
    var s = String(value).trim();
    if (!s) return null;
    try {
      return JSON.parse(s);
    } catch (e) {
      return null;
    }
  }

  function readLocal() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      var parsed = parseMaybeJson(raw);
      return parsed ? normalize(parsed) : null;
    } catch (e) {
      return null;
    }
  }

  function writeLocal(data) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(normalize(data)));
    } catch (e) {
      /* ignore */
    }
  }

  global.BuykonTerms = {
    SETTING_KEY: SETTING_KEY,
    STORAGE_KEY: STORAGE_KEY,
    DEFAULT: DEFAULT,
    getDefault: function () {
      return clone(DEFAULT);
    },
    normalize: normalize,
    parseMaybeJson: parseMaybeJson,
    readLocal: readLocal,
    writeLocal: writeLocal,
    slugify: slugify
  };
})(window);
