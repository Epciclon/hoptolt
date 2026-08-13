import { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Política de Privacidad | Hoptolt',
  description: 'Política de Privacidad y manejo de datos de Hoptolt.',
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-sm border border-slate-100 p-8 sm:p-12">
        <h1 className="text-3xl font-bold text-slate-900 mb-2">Política de Privacidad y Tratamiento de Datos Personales</h1>
        <p className="text-sm text-slate-500 mb-8">Última actualización: Agosto de 2026 | Versión 3.0.0</p>
        
        <div className="prose prose-slate prose-teal max-w-none space-y-8 text-slate-600 text-justify">
          
          <section>
            <h2 className="text-xl font-semibold text-slate-800 mb-3">1. Marco Legal y Cumplimiento Normativo</h2>
            <p>
              En estricto cumplimiento con lo establecido en la <strong>Constitución de la República del Ecuador</strong> (Art. 66, numeral 19), que reconoce y garantiza a las personas el derecho a la protección de datos de carácter personal, y en conformidad con la <strong>Ley Orgánica de Protección de Datos Personales (LOPDP)</strong> (Registro Oficial Suplemento 459 de 26-may.-2021) y su respectivo Reglamento, <strong>Hoptolt Ecuador</strong> (en adelante, "el Responsable" o "la Empresa") expide la presente Política de Privacidad. El objetivo de este documento es informar de manera clara, precisa e inequívoca a los usuarios ("el Titular") sobre los lineamientos técnicos, jurídicos y organizacionales aplicables al tratamiento de su información.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-800 mb-3">2. Definiciones Fundamentales</h2>
            <ul className="list-disc pl-5 space-y-2 mt-2">
              <li><strong>Titular:</strong> Persona natural o jurídica cuyos datos son objeto de tratamiento.</li>
              <li><strong>Dato Personal:</strong> Cualquier información que identifica o hace identificable a una persona natural.</li>
              <li><strong>Tratamiento:</strong> Cualquier operación o conjunto de operaciones realizadas sobre datos personales (recopilación, almacenamiento, uso, eliminación).</li>
              <li><strong>Base de Datos:</strong> Conjunto estructurado de datos que son objeto de tratamiento.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-800 mb-3">3. Naturaleza de la Información Recopilada</h2>
            <p>El Responsable recopila las siguientes categorías de datos, de forma directa e indirecta:</p>
            <ul className="list-disc pl-5 space-y-2 mt-2">
              <li><strong>Datos de Identificación y Contacto:</strong> Nombres completos,        información ingresada, incluyendo datos básicos como tu correo electrónico, tu nombre, y los perfiles de tu &quot;granja&quot; o &quot;galpón&quot;, así como losencriptadas mediante algoritmos criptográficos asimétricos.</li>
              <li><strong>Datos Operativos y Zootécnicos:</strong> Información introducida de forma voluntaria sobre la gestión cunícula, incluyendo pero no limitándose a: inventarios, peso, parámetros reproductivos, genéticos, cuadros de mortalidad y registros de alimentación.</li>
              <li><strong>Datos de Navegación y Telemetría (Cookies):</strong> Direcciones IP, tipo de navegador, sistema operativo, proveedor de servicios de internet (ISP), marcas de tiempo, y datos de interacción con la interfaz de usuario (UI).</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-800 mb-3">4. Finalidad y Base Legitimadora del Tratamiento</h2>
            <p>De acuerdo con el Art. 7 de la LOPDP, el tratamiento de los datos personales se realiza bajo las siguientes bases legitimadoras: (i) <strong>Consentimiento expreso</strong> e inequívoco del Titular al momento de registrarse, y (ii) <strong>Ejecución de medidas precontractuales o contractuales</strong> para la prestación del servicio SaaS.</p>
            <p>Las finalidades específicas incluyen:</p>
            <ul className="list-disc pl-5 space-y-2 mt-2">
              <li>La provisión, operación, mantenimiento y escalabilidad del servicio informático Hoptolt.</li>
              <li>La generación algorítmica de métricas, reportes productivos y analítica predictiva para la granja del usuario.</li>
              <li>La remisión de notificaciones de seguridad, alertas transaccionales y modificaciones contractuales.</li>
              <li>La anonimización de datos masivos (Big Data) para estudios macroeconómicos y zootécnicos del sector, de forma que no sea posible reidentificar al Titular.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-800 mb-3">5. Transferencias Internacionales y Encargados del Tratamiento</h2>
            <p>
              El Titular reconoce y autoriza expresamente que, debido a la naturaleza descentralizada de las infraestructuras de computación en la nube, sus datos pueden ser transferidos, alojados y procesados en servidores ubicados fuera de la jurisdicción de la República del Ecuador. Hoptolt emplea como &quot;Encargados del Tratamiento&quot; a proveedores tecnológicos de clase mundial (tales como Supabase y Amazon Web Services - AWS), los cuales cuentan con certificaciones internacionales de seguridad (ISO 27001, SOC 2). Estos terceros están sujetos a rigurosos Acuerdos de Confidencialidad (NDAs) y solo tratarán los datos conforme a nuestras instrucciones documentadas.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-800 mb-3">6. Medidas de Seguridad y Ciberdefensa</h2>
            <p>
              Nuestro sitio no utiliza cookies propias ni de terceros para fines de seguimiento o &quot;tracking&quot;. La única información almacenada en tu navegador esn la normativa ecuatoriana, Hoptolt ha implementado estrictas medidas de seguridad técnicas, físicas y administrativas para proteger la integridad, confidencialidad y disponibilidad de la Base de Datos. Esto incluye cifrado en tránsito (protocolo TLS 1.3), cifrado en reposo (AES-256), cortafuegos (firewalls) de aplicaciones web y controles de acceso basados en roles (RBAC). A pesar de estos esfuerzos, ningún sistema informático es infalible, por lo que el Titular asume el riesgo inherente a la transmisión de información a través de Internet.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-800 mb-3">7. Derechos del Titular (Derechos ARCO+)</h2>
            <p>Conforme al Capítulo III de la Ley Orgánica de Protección de Datos Personales de Ecuador, el Titular ejerce soberanía sobre su información y goza irrenunciablemente de los siguientes derechos:</p>
            <ul className="list-disc pl-5 space-y-2 mt-2">
              <li><strong>Derecho a la Información y Acceso:</strong> Conocer qué datos personales suyos poseemos y solicitar copias de los mismos.</li>
              <li><strong>Derecho a la Rectificación y Actualización:</strong> Corregir información inexacta, incompleta o desactualizada.</li>
              <li><strong>Derecho a la Eliminación (Derecho al olvido):</strong> Solicitar la supresión de sus datos cuando ya no sean necesarios para la finalidad originaria o cuando revoque su consentimiento.</li>
              <li><strong>Derecho a la Oposición:</strong> Negarse al tratamiento de sus datos para fines específicos (ej. marketing directo).</li>
              <li><strong>Derecho a la Portabilidad:</strong> Recibir sus datos personales en un formato estructurado, genérico, de uso común y lectura mecánica.</li>
            </ul>
            <p>
              Para ejercer cualquiera de estos derechos, el Titular deberá enviar una solicitud formal por escrito al correo del Departamento Legal de Hoptolt, adjuntando una copia de su cédula de identidad o documento que acredite su titularidad.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-800 mb-3">8. Plazo de Conservación</h2>
            <p>
              Los datos personales se conservarán mientras la cuenta del usuario se mantenga activa y sea necesario para cumplir con las finalidades descritas, o hasta que el Titular solicite su eliminación. Post-eliminación, ciertos datos transaccionales podrían retenerse temporalmente de forma bloqueada exclusivamente para cumplir con obligaciones legales, tributarias o para el ejercicio/defensa de reclamos jurídicos, respetando los plazos de prescripción de la legislación ecuatoriana.
            </p>
          </section>
          
        </div>

      </div>
    </div>
  );
}
