import React, { useState } from "react";
import { MapPin, Phone, Globe, ExternalLink } from "lucide-react";
import { useTranslation } from "@/lib/i18n";

interface Office {
  name: string;
  nameAr: string;
  address: string;
  addressAr: string;
  phone: string;
  mapQuery: string;
}

interface CountryOffices {
  country: string;
  countryAr: string;
  flag: string;
  offices: Office[];
}

const locations: CountryOffices[] = [
  {
    country: "Saudi Arabia (KSA)",
    countryAr: "المملكة العربية السعودية",
    flag: "🇸🇦",
    offices: [
      {
        name: "Jeddah Office",
        nameAr: "مكتب جدة",
        address: "Sharafiya, Jeddah, KSA",
        addressAr: "حي الشرفية، جدة، المملكة العربية السعودية",
        phone: "+966 564955765",
        mapQuery: "Sharafiya, Jeddah, Saudi Arabia",
      },
      {
        name: "Al Khobar Office",
        nameAr: "مكتب الخبر",
        address: "4th St, Al Khobar, KSA",
        addressAr: "الشارع الرابع، الخبر، المملكة العربية السعودية",
        phone: "+966 564955765",
        mapQuery: "4th St, Al Khobar, Saudi Arabia",
      },
    ],
  },
  {
    country: "Bahrain",
    countryAr: "مملكة البحرين",
    flag: "🇧🇭",
    offices: [
      {
        name: "Bahrain Office",
        nameAr: "مكتب البحرين",
        address: "3rd floor, Building 256, Office 302, 327 Rd No 2705, Bahrain",
        addressAr: "الطابق 3، مبنى 256، مكتب 302، طريق 2705، العدلية، البحرين",
        phone: "+973 7799 2124",
        mapQuery: "Building 256, Road 2705, Adliya, Bahrain",
      },
    ],
  },
  {
    country: "United Kingdom",
    countryAr: "المملكة المتحدة",
    flag: "🇬🇧",
    offices: [
      {
        name: "UK Office",
        nameAr: "مكتب المملكة المتحدة",
        address: "57, Grangemouth, FK3 8AW, United Kingdom",
        addressAr: "57، جرانجماوث، FK3 8AW، المملكة المتحدة",
        phone: "+44 75 0007 1363",
        mapQuery: "57, Grangemouth, FK3 8AW, United Kingdom",
      },
    ],
  },
  {
    country: "India",
    countryAr: "الهند",
    flag: "🇮🇳",
    offices: [
      {
        name: "Kerala Office",
        nameAr: "مكتب كيرلا",
        address: "1st Floor, Vilakathil Arcade, No. 408, Mukkam Road, Areekode, Kerala 673639",
        addressAr: "الطابق الأول، فيلاكاثيل أركيد، رقم 408، طريق موكام، أريكود، كيرلا 673639",
        phone: "090481 05191",
        mapQuery: "Vilakathil Arcade, Mukkam Road, Areekode, Kerala 673639, India",
      },
      {
        name: "Mumbai Office",
        nameAr: "مكتب مومباي",
        address: "44, Ashoka Shopping Centre, CST Area, Mumbai 400001",
        addressAr: "44، مركز أشوكا للتسوق، منطقة CST، مومباي 400001",
        phone: "090481 05191",
        mapQuery: "Ashoka Shopping Centre, CST Area, Mumbai 400001, India",
      },
    ],
  },
];

const OfficeLocations = () => {
  const { language } = useTranslation();
  const isAr = language === "ar";
  const [activeCountryIdx, setActiveCountryIdx] = useState(0);
  const [activeOfficeIdx, setActiveOfficeIdx] = useState(0);

  const activeCountry = locations[activeCountryIdx];
  const activeOffice = activeCountry.offices[activeOfficeIdx] || activeCountry.offices[0];

  const handleCountryChange = (idx: number) => {
    setActiveCountryIdx(idx);
    setActiveOfficeIdx(0);
  };

  return (
    <section className={`py-20 px-4 sm:px-6 lg:px-8 bg-slate-50 border-t border-b border-gray-100 ${isAr ? "font-arabic" : ""}`} dir={isAr ? "rtl" : "ltr"}>
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <span className="text-sm font-semibold text-purple-600 tracking-wider uppercase bg-purple-50 px-3 py-1 rounded-full">
            {isAr ? "توسعنا الدولي" : "Global Presence"}
          </span>
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mt-3 mb-4">
            {isAr ? "شبكة مكاتبنا ومقراتنا حول العالم" : "Our Global Office Locations"}
          </h2>
          <p className="text-gray-500 max-w-2xl mx-auto text-base md:text-lg">
            {isAr
              ? "تعمل لينالا عبر 4 مقرات إقليمية ودولية. اختر الدولة للاطلاع على تفاصيل الفروع وأرقام التواصل المباشرة وموقع الخريطة."
              : "LINALA WA operates in multiple countries. Click on a country below to explore our office locations, contact numbers, and view them on the map."}
          </p>
        </div>

        {/* Country Tabs */}
        <div className="flex flex-wrap justify-center gap-2 mb-8">
          {locations.map((loc, idx) => (
            <button
              key={idx}
              onClick={() => handleCountryChange(idx)}
              className={`flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold transition-all duration-300 transform hover:scale-[1.02] border cursor-pointer ${
                activeCountryIdx === idx
                  ? "bg-purple-600 border-purple-600 text-white shadow-lg shadow-purple-500/25"
                  : "bg-white border-gray-200 text-gray-700 hover:border-purple-300 hover:bg-purple-50/20"
              }`}
            >
              <span className="text-base">{loc.flag}</span>
              <span>{isAr ? loc.countryAr : loc.country}</span>
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
          {/* Office Selectors and Details */}
          <div className="lg:col-span-5 flex flex-col justify-between space-y-6">
            <div className="space-y-4">
              <h3 className="text-lg font-bold text-gray-900 mb-2 flex items-center gap-2">
                <Globe className="w-5 h-5 text-purple-500" />
                <span>{isAr ? "اختر فرع المكتب" : "Select Branch Location"}</span>
              </h3>
              
              {/* Branch list within selected country */}
              <div className="space-y-3">
                {activeCountry.offices.map((office, idx) => (
                  <button
                    key={idx}
                    onClick={() => setActiveOfficeIdx(idx)}
                    className={`w-full ${isAr ? "text-right" : "text-left"} p-4 rounded-xl border transition-all duration-300 cursor-pointer ${
                      activeOfficeIdx === idx
                        ? "bg-white border-purple-500 shadow-md ring-1 ring-purple-100"
                        : "bg-white/60 border-gray-100 hover:border-purple-200 hover:bg-white"
                    }`}
                  >
                    <h4 className={`font-semibold text-sm ${activeOfficeIdx === idx ? 'text-purple-600' : 'text-gray-800'}`}>
                      {isAr ? office.nameAr : office.name}
                    </h4>
                    <p className="text-gray-400 text-xs mt-1 line-clamp-1">
                      {isAr ? office.addressAr : office.address}
                    </p>
                  </button>
                ))}
              </div>
            </div>

            {/* Selected Office Details Card */}
            <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-sm space-y-5">
              <div>
                <span className="text-xs font-semibold text-purple-600 bg-purple-50 px-2 py-0.5 rounded">
                  {isAr ? activeCountry.countryAr : activeCountry.country}
                </span>
                <h3 className="text-xl font-bold text-gray-900 mt-2">
                  {isAr ? activeOffice.nameAr : activeOffice.name}
                </h3>
              </div>

              <div className="space-y-4">
                <div className="flex items-start gap-3 text-sm text-gray-600">
                  <MapPin className="w-5 h-5 text-purple-500 flex-shrink-0 mt-0.5" />
                  <span className="leading-relaxed">{isAr ? activeOffice.addressAr : activeOffice.address}</span>
                </div>
                
                <div className="flex items-center gap-3 text-sm text-gray-600">
                  <Phone className="w-5 h-5 text-purple-500 flex-shrink-0" />
                  <a
                    href={`tel:${activeOffice.phone.replace(/\s+/g, "")}`}
                    className="hover:text-purple-600 hover:underline font-medium transition-colors"
                    dir="ltr"
                  >
                    {activeOffice.phone}
                  </a>
                </div>
              </div>

              <div className="pt-2">
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(activeOffice.mapQuery)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center w-full px-4 py-3 border border-purple-200 text-purple-700 rounded-xl hover:bg-purple-50 font-semibold text-sm transition-colors group"
                >
                  <span>{isAr ? "عرض الموقع على خرائط جوجل" : "Open in Google Maps"}</span>
                  <ExternalLink className={`w-4 h-4 ${isAr ? "mr-2 rtl:rotate-180" : "ml-2"} group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform`} />
                </a>
              </div>
            </div>
          </div>

          {/* Interactive Map Embed */}
          <div className="lg:col-span-7 h-[350px] lg:h-auto min-h-[350px] rounded-2xl overflow-hidden border border-gray-200 shadow-sm relative">
            <iframe
              title="Office Location Map"
              width="100%"
              height="100%"
              style={{ border: 0 }}
              loading="lazy"
              allowFullScreen
              src={`https://maps.google.com/maps?q=${encodeURIComponent(activeOffice.mapQuery)}&t=&z=14&ie=UTF8&iwloc=&output=embed`}
            ></iframe>
          </div>
        </div>
      </div>
    </section>
  );
};

export default OfficeLocations;
