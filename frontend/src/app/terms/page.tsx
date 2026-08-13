import { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Términos y Condiciones | Hoptolt',
  description: 'Términos y Condiciones de uso de Hoptolt.',
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-sm border border-slate-100 p-8 sm:p-12">
        <h1 className="text-3xl font-bold text-slate-900 mb-2">Términos y Condiciones de Uso Contractual</h1>
        <p className="text-sm text-slate-500 mb-8">Última actualización: Agosto de 2026 | Versión 3.0.0</p>
        
        <div className="prose prose-slate prose-teal max-w-none space-y-8 text-slate-600 text-justify">
          
          <section>
            <h2 className="text-xl font-semibold text-slate-800 mb-3">1. Naturaleza y Aceptación del Contrato</h2>
            <p>
              El presente documento constituye un contrato legalmente vinculante, electrónico y de adhesión, celebrado entre <strong>Hoptolt Ecuador</strong> (en adelante, "el Proveedor" o "la Empresa") y el Usuario final (en adelante, "el Usuario" o "el Suscriptor"). En virtud de la <strong>Ley de Comercio Electrónico, Firmas Electrónicas y Mensajes de Datos del Ecuador</strong>, al marcar la casilla de "He leído y acepto los Términos y Condiciones" durante el flujo de registro, el Usuario manifiesta su consentimiento expreso, libre e informado, asumiendo la totalidad de las cláusulas aquí descritas.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-800 mb-3">2. Objeto del Contrato y Licenciamiento</h2>
            <p>
              Hoptolt proporciona una plataforma de Software como Servicio (SaaS) especializada en la trazabilidad y gestión productiva de explotaciones cunículas. El Proveedor otorga al Usuario una licencia limitada, no exclusiva, revocable, intransferible y no sublicenciable para acceder y utilizar la Plataforma estrictamente para los fines zootécnicos y de gestión previstos. Cualquier uso de la Plataforma fuera de este ámbito se considera una violación material del contrato.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-800 mb-3">3. Obligaciones Estrictas del Usuario</h2>
            <p>El Usuario se compromete de manera irrevocable a:</p>
            <ul className="list-disc pl-5 space-y-2 mt-2">
              <li>Ingresar información veraz, lícita y actualizada en los registros productivos.</li>
              <li>No realizar actividades de ingeniería inversa, descompilación, "scraping", "spidering" o extracción automatizada de la arquitectura de la Plataforma o sus bases de datos.</li>
              <li>No utilizar la Plataforma para el alojamiento de código malicioso (malware, troyanos) ni intentar vulnerar la seguridad de la infraestructura (pentesting no autorizado).</li>
              <li>No comercializar, revender ni arrendar el acceso a la Plataforma a terceros sin el consentimiento expreso y por escrito del Proveedor.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-800 mb-3">4. Derechos de Propiedad Intelectual e Industrial</h2>
            <p>
              Toda la infraestructura tecnológica, código fuente, algoritmos, interfaces gráficas (UI/UX), marcas comerciales, nombres comerciales y logotipos asociados a "Hoptolt" constituyen propiedad intelectual exclusiva del Proveedor, protegidos bajo la <strong>Ley de Propiedad Intelectual de la República del Ecuador</strong> y los tratados internacionales pertinentes. Ninguna disposición de este contrato transfiere titularidad alguna sobre dichos activos al Usuario.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-800 mb-3">5. Cláusula de Limitación de Responsabilidad (Disclaimer)</h2>
            <p>
              La Plataforma Hoptolt es una herramienta de registro y analítica que sirve de apoyo en la toma de decisiones, pero <strong>NO sustituye el criterio técnico de un profesional veterinario o zootecnista colegiado</strong>. Por consiguiente:
            </p>
            <ul className="list-disc pl-5 space-y-2 mt-2">
              <li>El Proveedor declina expresamente toda responsabilidad por caídas en la rentabilidad, brotes epidemiológicos, índices de mortalidad elevados o cualquier perjuicio económico directo, indirecto, incidental o consecuente que el Usuario alegue haber sufrido en su explotación pecuaria.</li>
              <li>El Proveedor no garantiza un "Acuerdo de Nivel de Servicio" (SLA) del 100% de disponibilidad. La Plataforma puede sufrir interrupciones temporales por mantenimiento de servidores, actualizaciones de parcheo o eventos de fuerza mayor.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-800 mb-3">6. Cláusula de Indemnidad</h2>
            <p>
              El Usuario acuerda defender, indemnizar y mantener indemne a Hoptolt, sus directivos, empleados y proveedores tecnológicos, frente a cualquier reclamo, demanda, daño, obligación, pérdida o gasto (incluyendo honorarios razonables de abogados) que surja como consecuencia directa de: (i) el incumplimiento de estos Términos y Condiciones por parte del Usuario, o (ii) la infracción por parte del Usuario de derechos de terceros, incluyendo derechos de privacidad o propiedad intelectual.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-800 mb-3">7. Jurisdicción y Resolución de Controversias</h2>
            <p>
              Cualquier controversia, diferencia o disputa que surja en torno a la interpretación, ejecución o terminación de este contrato se regirá por las leyes de la República del Ecuador. Las partes renuncian expresamente a su fuero y domicilio, y se someten a la mediación y, de ser necesario, al arbitraje en derecho ante los Centros de Arbitraje avalados en el Ecuador, o ante los jueces civiles competentes de la ciudad sede del Proveedor.
            </p>
          </section>

        </div>

      </div>
    </div>
  );
}
