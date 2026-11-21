# Web Mastery — HTML · CSS · JavaScript من الصفر للاحتراف 🌐

كورس ويب تفاعلي بالعربي (RTL) بعينين: عين **المطوّر** اللي بيبني مواقع وبرامج حقيقية نضيفة وسريعة ومتاحة للكل، وعين **الـ Pentester** ومحلل الـ **Malware** اللي بيفهم المتصفح بيـ parse الكود إزاي، والـ forms بتبعت إيه بالظبط، وليه payload صغير بيقلب صفحة كاملة.

> الأكواد والتعليقات والمخرجات **بالإنجليزية**، والشرح **بالعربي**. المرجع: HTML Living Standard (WHATWG) وMDN.

## الأجزاء

| الجزء | الحالة | المحتوى |
|---|---|---|
| **1 · HTML** | ✅ متاح | الويب والـ HTTP · هيكل المستند والـ syntax · النصوص والـ entities · الروابط والـ URLs · القوائم والجداول · الوسائط وSVG · الـ semantics والـ global attributes · الفورمز (العناصر + الإرسال والـ validation) · الـ head والـ metadata · الـ iframes والـ sandbox والـ clickjacking · الـ accessibility والـ SEO · **الـ parser من جوه** (tokenizer، tree builder، foreign content، mXSS) · الـ encoding والـ contexts · Recon من الـ source · HTML injection والـ XSS · أدوات المطوّر (Emmet، تنظيم المشروع، Git، النشر، Web Components) |
| **2 · CSS** | ⏳ الجاي | الـ cascade، الـ box model، Flexbox وGrid، الـ responsive، الـ animations، CSS حديثة — وCSS injection والـ UI redressing |
| **3 · JavaScript** | ⏳ | اللغة كاملة، الـ DOM والـ browser APIs، الـ tooling، Node.js — وDOM XSS وفك الـ JS المتشوّش |
| **4 · Web Security** | ⏳ | SOP/CORS/CSP، XSS متقدم، CSRF، postMessage، DOM clobbering، HTML smuggling وتحليل phishing kits، الدفاع والتقارير |

الجزء الأول فيه: **110 سؤال** بشرح، **30 معمل بيتصحح أوتوماتيك**، **38 مهمة تحليل** (إجاباتها متخزنة SHA-256)، **XSS Range من 13 مستوى**، **59 مثال حي**، **9 مشاريع** + Capstone.

## جوه الصفحة

- **معاينة حية لكل مثال** في `<iframe sandbox="allow-scripts allow-forms">` (origin معزول، من غير وصول لأي حاجة في صفحتك). الضغط على لينك أو إرسال فورم مبيسيبش الصفحة — بيتسجّل تحت المعاينة: الـ URL النهائي، الـ `Referer`، و**الـ HTTP request بالظبط** (urlencoded / multipart / text/plain، استبدال الـ query في GET، الـ CRLF، `formaction`…).
- **🧪 المعمل الحر**: محرر HTML/CSS/JS + معاينة + شجرة الـ DOM الحية + Console + Requests.
- **أدوات**: URL Inspector، Encoder/Decoder chain (CyberChef مصغّر)، **HTML Tokenizer خطوة بخطوة** على states الـ spec، Parser Playground (scripting on/off للـ mXSS)، ومشاهد متحركة.
- **Sandbox تحليل** للعينات (CSP `default-src 'none'` + تسجيل الـ sinks: `document.write`، `eval`، `atob`، `fetch`، `createObjectURL`…).
- التقدّم بيتحفظ في `localStorage` تحت `webMastery.v1`. وضع داكن/فاتح، حجم خط، بحث، طباعة.

## البناء والتحقق

```bash
python tools/build.py                    # يبني index.html ويتحقق (ids، روابط، أسئلة، معامل، مهام)
python -m http.server 8793               # سيرفر محلي
node tools/selftest.mjs                  # headless Chrome: كل حل معمل بيعدّي وكل starter بيفشل،
                                         # كل payload مرجعي في الـ XSS Range بيشتغل والـ input البريء لأ،
                                         # كل إجابة مهمة بتطابق الـ hash، وكل مثال من غير console errors
node tools/shots.mjs shots/              # screenshots للمراجعة البصرية
```

قواعد الكتابة في [`tools/AUTHORING.md`](tools/AUTHORING.md)، والخطة في [`PLAN.md`](PLAN.md).

## الأمان والأخلاقيات

كل الهجمات بتتنفّذ جوه sandbox في متصفحك، والدومينات من نطاقات التوثيق (`*.example`). العينات «الخبيثة» تعليمية ومن تأليفنا. جرّب أي حاجة من دي بس على أنظمة **مصرّح لك** تختبرها.
