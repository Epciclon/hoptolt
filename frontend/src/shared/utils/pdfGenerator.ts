import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export interface PDFColumn {
    header: string;
    dataKey: string;
}

export interface GeneratePDFOptions {
    title: string;
    subtitle?: string;
    columns: PDFColumn[];
    data: any[];
    filename?: string;
    action?: 'save' | 'bloburl';
}

export const generatePDF = ({ title, subtitle, columns, data, filename, action = 'save' }: GeneratePDFOptions) => {
    const doc = new jsPDF();

    // Add title
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(40);
    const pageWidth = doc.internal.pageSize.width;
    doc.text(title, pageWidth / 2, 22, { align: 'center' });

    // Add subtitle if provided
    let startY = 32;
    if (subtitle) {
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100);
        const lines = subtitle.split('\n');
        lines.forEach((line, index) => {
            doc.text(line, pageWidth / 2, 30 + (index * 6), { align: 'center' });
        });
        startY = 34 + (lines.length * 6);
    }

    // Add table
    autoTable(doc, {
        head: [columns.map(col => col.header)],
        body: data.map(item => columns.map(col => item[col.dataKey] !== undefined && item[col.dataKey] !== null ? item[col.dataKey] : 'N/A')),
        startY: startY,
        theme: 'grid',
        styles: { fontSize: 9, cellPadding: 3 },
        headStyles: { fillColor: [66, 66, 66], textColor: [255, 255, 255] },
        alternateRowStyles: { fillColor: [245, 245, 245] },
    });

    if (action === 'bloburl') {
        return doc.output('datauristring');
    }

    // Save PDF
    if (filename) {
        doc.save(`${filename}.pdf`);
    }
};
