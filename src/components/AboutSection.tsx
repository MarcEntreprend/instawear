// src\components\AboutSection.tsx

export default function AboutSection() {
  return (
    <section
      id="section-about"
      className="bg-white border-t border-gray-200 mt-12 py-12 px-4 scroll-mt-28"
    >
      <div className="max-w-4xl mx-auto text-center flex flex-col items-center">
        <span className="bg-linear-to-r from-(--color-accent) to-(--color-accent2) text-white text-[10px] font-black uppercase px-3 py-1 rounded-full mb-4">
          🎨 NOTRE HISTOIRE
        </span>
        <h3 className="text-3xl font-black text-gray-900 leading-tight">
          À Propos d&apos;InstaWear
        </h3>
        <p className="text-sm text-gray-600 mt-4 leading-relaxed max-w-2xl font-sans">
          InstaWear a été fondé par un collectif d&apos;adeptes de pop culture,
          de fans de sport et d&apos;ingénieurs passionnés d&apos;intelligence
          artificielle. Notre mission : vous permettre de porter l&apos;énergie
          des événements mondiaux en temps réel.
        </p>
        <p className="text-sm text-gray-500 mt-2.5 leading-relaxed max-w-2xl font-sans">
          Chaque pièce est fabriquée sur mesure pour vous : nous nous connectons
          directement aux usines d&apos;impression Printful. Zéro vêtements
          produits en excès, zéro gaspillage de stock. Nous croyons en la mode
          circulaire et réactive. C&apos;est le Print-on-Demand du futur.
        </p>
        <div className="flex gap-4 sm:gap-8 md:gap-12 mt-8 text-center bg-gray-50/60 p-4 sm:p-6 rounded-2xl border border-gray-200">
          <div>
            <p className="text-3xl font-black text-(--color-accent) font-sans">
              100%
            </p>
            <p className="text-xs text-gray-500 uppercase tracking-wider font-bold mt-1">
              Coton Bio certifié
            </p>
          </div>
          <div className="border-l border-gray-200"></div>
          <div>
            <p className="text-3xl font-black text-indigo-400 font-sans">0</p>
            <p className="text-xs text-gray-500 uppercase tracking-wider font-bold mt-1">
              Stock détruit
            </p>
          </div>
          <div className="border-l border-gray-200"></div>
          <div>
            <p className="text-3xl font-black text-amber-500 font-sans">24h</p>
            <p className="text-xs text-gray-500 uppercase tracking-wider font-bold mt-1">
              Création &rarr; Print
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
