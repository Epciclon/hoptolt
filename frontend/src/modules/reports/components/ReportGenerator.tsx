'use client';

import { useState, useMemo, useEffect } from 'react';
import { Button, Input, Select, Card, CardHeader, Badge } from '@/shared/ui';
import { Calendar, Download, FileText, Settings, Info, X, Maximize, Minimize } from 'lucide-react';
import type { PDFColumn } from '@/shared/utils/pdfGenerator';
import { REPORT_MODULES } from '../types/reports.types';
import { useReports } from '../hooks/useReports';
import { useRaces } from '../../races/hooks/useRaces';
import { farmMemberService } from '../../farmMember/services/farmMember.service';
import type { FarmMember } from '../../farmMember/types/farmMember.types';

const formatCageNumber = (num: any, type: any) => {
    if (!num) return 'N/A';
    if (!type) return String(num);
    const capitalizedType = type.charAt(0).toUpperCase() + type.slice(1);
    return `${num} (${capitalizedType})`;
};

const formatRabbitInfo = (code: any, name: any) => {
    const safeCode = code || 'N/A';
    if (name && name !== 'N/A') return `${safeCode} - ${name}`;
    return safeCode;
};

const formatArrayOrString = (val: any) => Array.isArray(val) ? val.join(', ') : (val || 'N/A');
const getResponsible = (row: any) => row.profileName || row.responsible || row.profile?.fullName || row.profile?.username || 'N/A';
const formatRabbitsList = (rabbits: any[]) => {
    if (!Array.isArray(rabbits) || rabbits.length === 0) return 'Ninguno';
    return rabbits.map((r: any) => formatRabbitInfo(r.code, r.name)).join('\n');
};

interface ReportGeneratorProps {
    galponId: number | string;
    galpon?: any;
    onToast: (msg: string, type?: 'success' | 'error') => void;
}

export function ReportGenerator({ galponId, galpon, onToast }: Readonly<ReportGeneratorProps>) {
    const [selectedModule, setSelectedModule] = useState(REPORT_MODULES[0].id);
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [appliedStartDate, setAppliedStartDate] = useState('');
    const [appliedEndDate, setAppliedEndDate] = useState('');

    // Dynamic filters state
    const [selectedRaces, setSelectedRaces] = useState<string[]>([]);
    const [selectedProfileIds, setSelectedProfileIds] = useState<string[]>([]);
    const [selectedCageTypes, setSelectedCageTypes] = useState<string[]>([]);
    const [members, setMembers] = useState<FarmMember[]>([]);
    const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
    const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null);
    const [isExpanded, setIsExpanded] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);

    // Sorting state
    const [sortBy, setSortBy] = useState('date');

    const { loading, previewData, setPreviewData, fetchPreview } = useReports(onToast);
    const { races: allRaces } = useRaces();

    useEffect(() => {
        if (galponId) {
            farmMemberService.getAllMembersByGalpon(Number(galponId))
                .then(setMembers)
                .catch(err => console.error('Error fetching members:', err));
        }
    }, [galponId]);

    const formatDateTime = (dateString: string | null | undefined, includeTime: boolean = true) => {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        const ecuadorDate = new Date(date.toLocaleString('en-US', { timeZone: 'America/Guayaquil' }));
        const formattedDate = ecuadorDate.toLocaleDateString('es-EC', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });

        if (!includeTime) return formattedDate;

        const formattedTime = ecuadorDate.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        });
        return `${formattedDate} ${formattedTime.toLowerCase()}`;
    };

    const capitalizeString = (str: string | null | undefined) => {
        if (!str) return 'N/A';
        return str.charAt(0).toUpperCase() + str.slice(1);
    };

    // Generate columns based on selected module
    const getColumns = (): { ui: any[], pdf: PDFColumn[] } => {
        switch (selectedModule) {
            case 'feeding':
                return {
                    ui: [
                        { key: 'feedingDate', header: 'Fecha y Hora', render: (row: any) => formatDateTime(row.feedingDate) },
                        { key: 'cageNumber', header: 'Jaula', render: (row: any) => formatCageNumber(row.cageNumber, row.cageType) },
                        {
                            key: 'rabbits', header: 'Conejos', render: (row: any) => (
                                <div className="flex flex-col gap-1">
                                    {Array.isArray(row.rabbits) && row.rabbits.length > 0
                                        ? row.rabbits.map((r: any) => <span key={r.code || Math.random().toString()} className="whitespace-nowrap">{formatRabbitInfo(r.code, r.name)}</span>)
                                        : 'Ninguno'
                                    }
                                </div>
                            )
                        },
                        { key: 'foodTypes', header: 'Alimento', render: (row: any) => formatArrayOrString(row.foodTypes) },
                        { key: 'responsible', header: 'Reportado por', render: (row: any) => getResponsible(row) },
                        {
                            key: 'justification', header: 'Justificación', render: (row: any) => (
                                <div className="max-w-[200px] whitespace-normal break-words">
                                    {row.justification || 'N/A'}
                                </div>
                            )
                        }
                    ],
                    pdf: [
                        { header: 'Fecha y Hora', dataKey: 'formattedDate' },
                        { header: 'Jaula', dataKey: 'cageNumber' },
                        { header: 'Conejos', dataKey: 'rabbitsListStr' },
                        { header: 'Alimento', dataKey: 'foodTypesStr' },
                        { header: 'Reportado por', dataKey: 'responsible' },
                        { header: 'Justificación', dataKey: 'justificationStr' }
                    ]
                };
            case 'vaccination':
                return {
                    ui: [
                        { key: 'vaccinationDate', header: 'Fecha y Hora', render: (row: any) => formatDateTime(row.vaccinationDate) },
                        { key: 'cageNumber', header: 'Jaula', render: (row: any) => row.cageNumber || 'N/A' },
                        {
                            key: 'rabbitInfo', header: 'Conejo', render: (row: any) => <span className="font-medium whitespace-nowrap">{formatRabbitInfo(row.rabbitCode || row.rabbit?.code, row.rabbitName || row.rabbit?.name)}</span>
                        },
                        { key: 'rabbitRace', header: 'Raza', render: (row: any) => row.rabbitRace || row.rabbit?.race || 'N/A' },
                        { key: 'vaccines', header: 'Vacunas', render: (row: any) => formatArrayOrString(row.vaccines) },
                        { key: 'responsible', header: 'Reportado por', render: (row: any) => getResponsible(row) }
                    ],
                    pdf: [
                        { header: 'Fecha y Hora', dataKey: 'formattedDate' },
                        { header: 'Jaula', dataKey: 'cageNumber' },
                        { header: 'Conejo', dataKey: 'rabbitInfo' },
                        { header: 'Raza', dataKey: 'rabbitRace' },
                        { header: 'Vacunas', dataKey: 'vaccinesList' },
                        { header: 'Reportado por', dataKey: 'responsible' }
                    ]
                };
            case 'deworming':
                return {
                    ui: [
                        { key: 'dewormingDate', header: 'Fecha y Hora', render: (row: any) => formatDateTime(row.dewormingDate) },
                        { key: 'cageNumber', header: 'Jaula', render: (row: any) => row.cageNumber || 'N/A' },
                        {
                            key: 'rabbitInfo', header: 'Conejo', render: (row: any) => <span className="font-medium whitespace-nowrap">{formatRabbitInfo(row.rabbitCode || row.rabbit?.code, row.rabbitName || row.rabbit?.name)}</span>
                        },
                        { key: 'rabbitRace', header: 'Raza', render: (row: any) => row.rabbitRace || row.rabbit?.race || 'N/A' },
                        { key: 'responsible', header: 'Reportado por', render: (row: any) => getResponsible(row) }
                    ],
                    pdf: [
                        { header: 'Fecha y Hora', dataKey: 'formattedDate' },
                        { header: 'Jaula', dataKey: 'cageNumber' },
                        { header: 'Conejo', dataKey: 'rabbitInfo' },
                        { header: 'Raza', dataKey: 'rabbitRace' },
                        { header: 'Reportado por', dataKey: 'responsible' }
                    ]
                };
            case 'cleaning':
                return {
                    ui: [
                        { key: 'cleaningDate', header: 'Fecha y Hora', render: (row: any) => formatDateTime(row.cleaningDate) },
                        {
                            key: 'cageNumber', header: 'Jaula', render: (row: any) => formatCageNumber(row.cageNumber || row.Cage?.number, row.cageType || row.Cage?.type)
                        },
                        {
                            key: 'rabbits', header: 'Conejos', render: (row: any) => (
                                <div className="flex flex-col gap-1">
                                    {Array.isArray(row.rabbits) && row.rabbits.length > 0
                                        ? row.rabbits.map((r: any) => <span key={r.code || Math.random().toString()} className="whitespace-nowrap">{formatRabbitInfo(r.code, r.name)}</span>)
                                        : 'Ninguno'
                                    }
                                </div>
                            )
                        },
                        { key: 'responsible', header: 'Reportado por', render: (row: any) => getResponsible(row) }
                    ],
                    pdf: [
                        { header: 'Fecha y Hora', dataKey: 'formattedDate' },
                        { header: 'Jaula', dataKey: 'cageNumber' },
                        { header: 'Conejos', dataKey: 'rabbitsListStr' },
                        { header: 'Reportado por', dataKey: 'responsible' }
                    ]
                };
            case 'mortality':
                return {
                    ui: [
                        { key: 'deathDate', header: 'Fecha', render: (row: any) => formatDateTime(row.deathDate, false) },
                        {
                            key: 'rabbit', header: 'Conejo', render: (row: any) => formatRabbitInfo(row.rabbitCode, row.rabbitName)
                        },
                        { key: 'race', header: 'Raza', render: (row: any) => row.rabbitRace || 'N/A' },
                        { key: 'cause', header: 'Causa' },
                        { key: 'observations', header: 'Observaciones' },
                        { key: 'responsible', header: 'Reportado por', render: (row: any) => getResponsible(row) }
                    ],
                    pdf: [
                        { header: 'Fecha', dataKey: 'formattedDate' },
                        { header: 'Conejo', dataKey: 'rabbitInfo' },
                        { header: 'Raza', dataKey: 'rabbitRace' },
                        { header: 'Causa', dataKey: 'cause' },
                        { header: 'Observaciones', dataKey: 'observations' },
                        { header: 'Reportado por', dataKey: 'responsible' }
                    ]
                };
            case 'reproduction': {
                const isAll = selectedStatuses.length === 0;
                const showEstado = true;
                const showGazapos = !isAll && selectedStatuses.every(s => ['lactancia', 'completado', 'fallido', 'parcial'].includes(s));
                const showCausa = !isAll && selectedStatuses.every(s => ['fallido', 'parcial'].includes(s));

                const uiColumns: any[] = [
                    { key: 'mountDate', header: 'Fecha y Hora de Monta', render: (row: any) => formatDateTime(row.mountDate) },
                    { key: 'cageNumber', header: 'Jaula', render: (row: any) => row.cageNumber || 'N/A' },
                    {
                        key: 'female', header: 'Hembra', render: (row: any) => formatRabbitInfo(row.femaleCode, row.femaleName)
                    },
                    {
                        key: 'male', header: 'Macho', render: (row: any) => formatRabbitInfo(row.maleCode, row.maleName)
                    },
                    { key: 'race', header: 'Raza', render: (row: any) => row.femaleRace || 'N/A' },
                    { key: 'responsible', header: 'Reportado por', render: (row: any) => getResponsible(row) }
                ];

                const pdfColumns: any[] = [
                    { header: 'Fecha y Hora de Monta', dataKey: 'formattedDate' },
                    { header: 'Jaula', dataKey: 'cageNumber' },
                    { header: 'Hembra', dataKey: 'femaleInfo' },
                    { header: 'Macho', dataKey: 'maleInfo' },
                    { header: 'Raza', dataKey: 'femaleRace' },
                    { header: 'Reportado por', dataKey: 'responsible' }
                ];

                if (showEstado) {
                    uiColumns.splice(5, 0, { key: 'status', header: 'Estado', render: (row: any) => <span className="capitalize">{row.status}</span> });
                    pdfColumns.splice(5, 0, { header: 'Estado', dataKey: 'formattedStatus' });
                }

                let gazaposHeader = 'Gazapos';
                if (!isAll) {
                    const hasVivos = selectedStatuses.some(s => ['lactancia', 'completado'].includes(s));
                    const hasMuertos = selectedStatuses.some(s => ['fallido', 'parcial'].includes(s));
                    if (hasVivos && !hasMuertos) {
                        gazaposHeader = 'Gazapos vivos';
                    } else if (hasMuertos && !hasVivos) {
                        gazaposHeader = 'Gazapos muertos';
                    }
                }

                if (showGazapos) {
                    uiColumns.push({ key: 'bornKits', header: gazaposHeader, render: (row: any) => row.bornKitsStr });
                    pdfColumns.push({ header: gazaposHeader, dataKey: 'bornKitsStr' });
                }

                if (showCausa) {
                    uiColumns.push({ key: 'cause', header: 'Causa', render: (row: any) => row.cancellationReason ? capitalizeString(row.cancellationReason) : '-' });
                    pdfColumns.push({ header: 'Causa', dataKey: 'cancellationReasonStr' });
                }

                return { ui: uiColumns, pdf: pdfColumns };
            }
            default:
                return { ui: [], pdf: [] };
        }
    };

    const handleFetchPreview = () => {
        if (!startDate) {
            onToast('Debes seleccionar una fecha de inicio', 'error');
            return;
        }
        if (!endDate) {
            onToast('Debes seleccionar una fecha de fin', 'error');
            return;
        }
        if (new Date(endDate) < new Date(startDate)) {
            onToast('La fecha de fin no puede ser menor a la fecha de inicio', 'error');
            return;
        }

        setAppliedStartDate(startDate);
        setAppliedEndDate(endDate);

        const startISO = startDate ? new Date(`${startDate}T00:00:00-05:00`).toISOString() : undefined;
        const endISO = endDate ? new Date(`${endDate}T23:59:59-05:00`).toISOString() : undefined;

        fetchPreview({
            galponId,
            module: selectedModule,
            startDate: startISO,
            endDate: endISO,
            races: selectedRaces.length > 0 && !['feeding', 'cleaning'].includes(selectedModule) ? selectedRaces.join(',') : undefined,
            profileId: selectedProfileIds.length > 0 ? selectedProfileIds.join(',') : undefined,
            cageType: selectedCageTypes.length > 0 ? selectedCageTypes.join(',') : undefined,
            status: selectedStatuses.length > 0 ? selectedStatuses.join(',') : undefined
        });
    };

    const sortedPreviewData = useMemo(() => {
        if (!previewData || previewData.length === 0) return [];
        let data = [...previewData];

        if (sortBy === 'date') {
            data.sort((a, b) => {
                const getDate = (item: any) => {
                    switch (selectedModule) {
                        case 'feeding': return item.feedingDate;
                        case 'vaccination': return item.vaccinationDate;
                        case 'deworming': return item.dewormingDate;
                        case 'cleaning': return item.cleaningDate;
                        case 'mortality': return item.deathDate;
                        case 'reproduction': return item.mountDate;
                        default: return null;
                    }
                };
                const dA = getDate(a);
                const dB = getDate(b);
                if (!dA || !dB) return 0;
                return new Date(dB).getTime() - new Date(dA).getTime();
            });
        } else if (sortBy === 'entity') {
            data.sort((a, b) => {
                if (['feeding', 'cleaning'].includes(selectedModule)) {
                    const cageA = a.cage?.number || a.cageNumber || a.Cage?.number || 0;
                    const cageB = b.cage?.number || b.cageNumber || b.Cage?.number || 0;
                    return cageA - cageB;
                } else {
                    const codeA = a.rabbit?.code || a.rabbitCode || a.femaleCode || '';
                    const codeB = b.rabbit?.code || b.rabbitCode || b.femaleCode || '';
                    return codeA.localeCompare(codeB);
                }
            });
        }
        return data;
    }, [previewData, sortBy, selectedModule]);

    useEffect(() => {
        if (sortedPreviewData.length === 0) {
            setPdfPreviewUrl(null);
            return;
        }

        const buildPdf = async () => {
            const moduleConfig = REPORT_MODULES.find(m => m.id === selectedModule);
            const { pdf: columns } = getColumns();

            const formattedData = sortedPreviewData.map(item => {
                const row = { ...item };

                if (selectedModule === 'feeding') {
                    row.formattedDate = formatDateTime(item.feedingDate);
                    row.cageNumber = formatCageNumber(item.cageNumber, item.cageType);
                    row.foodTypesStr = formatArrayOrString(item.foodTypes);
                    row.justificationStr = item.justification || 'N/A';
                    row.rabbitsListStr = formatRabbitsList(item.rabbits);
                    row.responsible = getResponsible(item);
                } else if (selectedModule === 'vaccination') {
                    row.formattedDate = formatDateTime(item.vaccinationDate);
                    row.cageNumber = item.rabbit?.assignments?.[0]?.cage?.number || 'N/A';
                    row.rabbitInfo = formatRabbitInfo(item.rabbitCode || item.rabbit?.code, item.rabbitName || item.rabbit?.name);
                    row.rabbitRace = item.rabbitRace || item.rabbit?.race || 'N/A';
                    row.vaccinesList = formatArrayOrString(item.vaccines);
                    row.responsible = getResponsible(item);
                } else if (selectedModule === 'deworming') {
                    row.formattedDate = formatDateTime(item.dewormingDate);
                    row.cageNumber = item.rabbit?.assignments?.[0]?.cage?.number || 'N/A';
                    row.rabbitInfo = formatRabbitInfo(item.rabbitCode || item.rabbit?.code, item.rabbitName || item.rabbit?.name);
                    row.rabbitRace = item.rabbitRace || item.rabbit?.race || 'N/A';
                    row.responsible = getResponsible(item);
                } else if (selectedModule === 'cleaning') {
                    row.formattedDate = formatDateTime(item.cleaningDate);
                    row.cageNumber = formatCageNumber(item.cageNumber || item.Cage?.number, item.cageType || item.Cage?.type);
                    row.rabbitsListStr = formatRabbitsList(item.rabbits);
                    row.responsible = getResponsible(item);
                } else if (selectedModule === 'mortality') {
                    row.formattedDate = formatDateTime(item.deathDate, false);
                    row.rabbitInfo = formatRabbitInfo(item.rabbitCode, item.rabbitName);
                    row.rabbitRace = item.rabbitRace || 'N/A';
                    row.responsible = getResponsible(item);
                } else if (selectedModule === 'reproduction') {
                    row.formattedDate = formatDateTime(item.mountDate);
                    row.cageNumber = item.cageNumber || 'N/A';
                    row.femaleInfo = formatRabbitInfo(item.femaleCode, item.femaleName);
                    row.maleInfo = formatRabbitInfo(item.maleCode, item.maleName);
                    row.femaleRace = item.femaleRace || 'N/A';
                    row.formattedStatus = capitalizeString(item.status || '');
                    row.responsible = getResponsible(item);

                    let kitsStr = '-';
                    if (item.bornKits !== null && item.bornKits !== undefined) {
                        const st = (item.status || '').toLowerCase();
                        if (['lactancia', 'completado'].includes(st)) {
                            kitsStr = `${item.bornKits} vivo${item.bornKits === 1 ? '' : 's'}`;
                        } else if (['fallido', 'parcial'].includes(st)) {
                            kitsStr = `${item.bornKits} muerto${item.bornKits === 1 ? '' : 's'}`;
                        } else {
                            kitsStr = item.bornKits.toString();
                        }
                    }
                    row.bornKitsStr = kitsStr;
                    row.cancellationReasonStr = item.cancellationReason ? capitalizeString(item.cancellationReason) : '-';
                    row.observationsStr = item.observations ? capitalizeString(item.observations) : '-';
                }

                return row;
            });

            try {
                const { generatePDF } = await import('@/shared/utils/pdfGenerator');
                const url = generatePDF({
                    title: `Reporte de ${moduleConfig?.label} de Conejos`,
                    subtitle: `Galpón: ${galpon?.name || 'Desconocido'}\nUbicación: ${galpon?.location || 'Desconocido'}, ${galpon?.province || 'Desconocido'}\nFecha del Reporte: Desde: ${appliedStartDate} Hasta: ${appliedEndDate}`,
                    columns,
                    data: formattedData,
                    action: 'bloburl'
                }) as string;

                setPdfPreviewUrl(url);
            } catch (error) {
                console.error('Error generating PDF preview:', error);
                setPdfPreviewUrl(null);
            }
        };

        buildPdf();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [sortedPreviewData, selectedModule, appliedStartDate, appliedEndDate]);

    const handleExpandPDF = () => {
        if (!pdfPreviewUrl) {
            onToast('No hay datos para exportar', 'error');
            return;
        }
        setIsExpanded(!isExpanded);
    };

    const handleDownloadPDF = async () => {
        if (!pdfPreviewUrl) {
            onToast('No hay datos para exportar', 'error');
            return;
        }

        setIsDownloading(true);
        try {
            const moduleConfig = REPORT_MODULES.find(m => m.id === selectedModule);

            const response = await fetch(pdfPreviewUrl);
            const blob = await response.blob();
            const blobUrl = URL.createObjectURL(blob);

            const a = document.createElement('a');
            a.href = blobUrl;
            const galponName = (galpon?.name || 'Galpon').replace(/\s+/g, '');
            const reportName = (moduleConfig?.label || 'Reporte').replace(/\s+/g, '');
            const today = new Date();
            const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
            a.download = `${galponName}_${reportName}_${dateStr}.pdf`;
            document.body.appendChild(a);
            a.click();
            a.remove();

            setTimeout(() => URL.revokeObjectURL(blobUrl), 100);

            onToast('PDF descargado exitosamente', 'success');
        } catch (error) {
            console.error('Error downloading PDF:', error);
            onToast('Error al procesar la descarga', 'error');
        } finally {
            setIsDownloading(false);
        }
    };

    return (
        <Card className="min-h-[calc(100vh-7rem)] flex flex-col">
            <CardHeader title="Centro de Reportes" subtitle="Genera y exporta reportes de todos los módulos." />

            <div className="flex flex-col md:flex-row gap-6 p-6 pt-0 flex-1">
                {/* Panel de Filtros */}
                {!isExpanded && (
                    <div className="w-full md:w-1/3 flex flex-col gap-4 border-r pr-0 md:pr-6 border-slate-200 border-b md:border-b-0 pb-6 md:pb-0">
                        <div className="flex items-center gap-2 mb-2">
                            <Settings className="w-5 h-5 text-slate-500" />
                            <h3 className="text-lg font-semibold text-slate-800">Filtros del Reporte</h3>
                        </div>

                        <div className="space-y-4">
                            <Select
                                label="Tipo de Reporte"
                                value={selectedModule}
                                onChange={(e) => {
                                    setSelectedModule(e.target.value);
                                    setPreviewData([]);
                                }}
                                options={REPORT_MODULES.map(m => ({ label: m.label, value: m.id }))}
                            />

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Input
                                        label="Fecha Inicio"
                                        type="date"
                                        value={startDate}
                                        onChange={(e) => setStartDate(e.target.value)}
                                    />
                                </div>
                                <div>
                                    <Input
                                        label="Fecha Fin"
                                        type="date"
                                        value={endDate}
                                        onChange={(e) => setEndDate(e.target.value)}
                                    />
                                </div>
                            </div>

                            {/* Filtros específicos por módulo */}
                            {['vaccination', 'deworming', 'mortality', 'reproduction'].includes(selectedModule) && (
                                <div className="w-full">
                                    <Select
                                        label="Filtrar por Raza"
                                        value=""
                                        onChange={(e) => {
                                            if (e.target.value && !selectedRaces.includes(e.target.value)) {
                                                setSelectedRaces([...selectedRaces, e.target.value]);
                                            }
                                        }}
                                        options={[
                                            { label: selectedRaces.length === 0 ? 'Todas las razas' : 'Seleccionar más...', value: '' },
                                            ...allRaces
                                                .filter(r => !selectedRaces.includes(r.name))
                                                .map(r => ({ label: r.name, value: r.name }))
                                        ]}
                                    />
                                    {selectedRaces.length > 0 && (
                                        <div className="flex flex-wrap gap-2 mt-2">
                                            {selectedRaces.map(race => (
                                                <button
                                                    key={race}
                                                    type="button"
                                                    onClick={() => setSelectedRaces(selectedRaces.filter(r => r !== race))}
                                                    className="cursor-pointer bg-transparent border-0 p-0"
                                                >
                                                    <Badge
                                                        variant="neutral"
                                                        className="flex items-center gap-1 hover:bg-slate-200 transition-colors"
                                                    >
                                                        {race} <X size={12} />
                                                    </Badge>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                    <p className="text-xs text-slate-500 mt-1">Opcional. Se puede seleccionar una o varias razas.</p>
                                </div>
                            )}

                            {/* Filtro Específico: Tipo de Jaula (solo para Alimentación y Limpieza) */}
                            {['feeding', 'cleaning'].includes(selectedModule) && (
                                <div className="w-full">
                                    <Select
                                        label="Filtrar por Tipo de Jaula"
                                        value=""
                                        onChange={(e) => {
                                            if (e.target.value && !selectedCageTypes.includes(e.target.value)) {
                                                setSelectedCageTypes([...selectedCageTypes, e.target.value]);
                                            }
                                        }}
                                        options={[
                                            { label: selectedCageTypes.length === 0 ? 'Todas las jaulas' : 'Seleccionar más...', value: '' },
                                            ...['engorde', 'reproducción']
                                                .filter(t => !selectedCageTypes.includes(t))
                                                .map(t => ({ label: capitalizeString(t), value: t }))
                                        ]}
                                    />
                                    {selectedCageTypes.length > 0 && (
                                        <div className="flex flex-wrap gap-2 mt-2">
                                            {selectedCageTypes.map(type => (
                                                <button
                                                    key={type}
                                                    type="button"
                                                    onClick={() => setSelectedCageTypes(selectedCageTypes.filter(t => t !== type))}
                                                    className="cursor-pointer bg-transparent border-0 p-0"
                                                >
                                                    <Badge
                                                        variant="neutral"
                                                        className="flex items-center gap-1 hover:bg-slate-200 transition-colors"
                                                    >
                                                        {capitalizeString(type)} <X size={12} />
                                                    </Badge>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                    <p className="text-xs text-slate-500 mt-1">Opcional. Se puede filtrar por uno o varios tipos de jaula.</p>
                                </div>
                            )}

                            {/* Filtro de Auditoría (Trabajador) para todos los módulos */}
                            <div className="w-full">
                                <Select
                                    label="Filtrar por Trabajador"
                                    value=""
                                    onChange={(e) => {
                                        if (e.target.value && !selectedProfileIds.includes(e.target.value)) {
                                            setSelectedProfileIds([...selectedProfileIds, e.target.value]);
                                        }
                                    }}
                                    options={[
                                        { label: selectedProfileIds.length === 0 ? 'Todos los trabajadores' : 'Seleccionar más...', value: '' },
                                        ...members
                                            .filter(m => !selectedProfileIds.includes(m.profile?.id || ''))
                                            .map(m => ({
                                                label: `${m.profile?.fullName || m.profile?.username || 'Usuario'}`,
                                                value: m.profile?.id || ''
                                            }))
                                    ]}
                                />
                                {selectedProfileIds.length > 0 && (
                                    <div className="flex flex-wrap gap-2 mt-2">
                                        {selectedProfileIds.map(profileId => {
                                            const member = members.find(m => m.profile?.id === profileId);
                                            const name = member?.profile?.fullName || member?.profile?.username || 'Usuario';
                                            return (
                                                <button
                                                    key={profileId}
                                                    type="button"
                                                    onClick={() => setSelectedProfileIds(selectedProfileIds.filter(id => id !== profileId))}
                                                    className="cursor-pointer bg-transparent border-0 p-0"
                                                >
                                                    <Badge
                                                        variant="neutral"
                                                        className="flex items-center gap-1 hover:bg-slate-200 transition-colors"
                                                    >
                                                        {name} <X size={12} />
                                                    </Badge>
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}
                                <p className="text-xs text-slate-500 mt-1">Opcional. Se puede filtrar por uno o varios trabajadores.</p>
                            </div>

                            {selectedModule === 'reproduction' && (
                                <div className="w-full">
                                    <Select
                                        label="Filtrar por Estado"
                                        value=""
                                        onChange={(e) => {
                                            if (e.target.value && !selectedStatuses.includes(e.target.value)) {
                                                setSelectedStatuses([...selectedStatuses, e.target.value]);
                                            }
                                        }}
                                        options={[
                                            { label: selectedStatuses.length === 0 ? 'Todos los estados' : 'Seleccionar más...', value: '' },
                                            ...[
                                                { label: 'Monta', value: 'monta' },
                                                { label: 'Gestación', value: 'gestacion' },
                                                { label: 'Lactancia', value: 'lactancia' },
                                                { label: 'Completado', value: 'completado' },
                                                { label: 'Fallido', value: 'fallido' },
                                                { label: 'Baja Parcial', value: 'parcial' }
                                            ].filter(s => !selectedStatuses.includes(s.value))
                                        ]}
                                    />
                                    {selectedStatuses.length > 0 && (
                                        <div className="flex flex-wrap gap-2 mt-2">
                                            {selectedStatuses.map(st => {
                                                const label = [
                                                    { label: 'Monta', value: 'monta' },
                                                    { label: 'Gestación', value: 'gestacion' },
                                                    { label: 'Lactancia', value: 'lactancia' },
                                                    { label: 'Completado', value: 'completado' },
                                                    { label: 'Fallido', value: 'fallido' },
                                                    { label: 'Baja Parcial', value: 'parcial' }
                                                ].find(s => s.value === st)?.label;
                                                
                                                return (
                                                    <button
                                                        key={st}
                                                        type="button"
                                                        onClick={() => setSelectedStatuses(selectedStatuses.filter(s => s !== st))}
                                                        className="cursor-pointer bg-transparent border-0 p-0"
                                                    >
                                                        <Badge
                                                            variant="neutral"
                                                            className="flex items-center gap-1 hover:bg-slate-200 transition-colors"
                                                        >
                                                            {label} <X size={12} />
                                                        </Badge>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    )}
                                    <p className="text-xs text-slate-500 mt-1">Opcional. Se puede seleccionar uno o varios estados.</p>
                                </div>
                            )}

                            <Select
                                label="Ordenar por"
                                value={sortBy}
                                onChange={(e) => setSortBy(e.target.value)}
                                options={[
                                    { label: 'La fecha del registro más nuevo', value: 'date' },
                                    { label: ['feeding', 'cleaning'].includes(selectedModule) ? 'Orden numérico de la jaula' : 'Orden alfabético del conejo', value: 'entity' }
                                ]}
                            />

                            <Button
                                className="w-full mt-4"
                                onClick={handleFetchPreview}
                                loading={loading}
                                icon={<Calendar size={18} />}
                            >
                                Generar Vista Previa
                            </Button>
                        </div>
                    </div>
                )}

                {/* Área de Vista Previa */}
                <div className={`flex flex-col transition-all duration-300 ${isExpanded ? 'w-full' : 'w-full md:w-2/3'}`}>
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                            <FileText className="w-5 h-5 text-primary-500" />
                            Vista Previa
                        </h3>
                        <div className="flex gap-2">
                            <Button
                                variant="outline"
                                onClick={handleExpandPDF}
                                disabled={!pdfPreviewUrl}
                                icon={isExpanded ? <Minimize size={18} /> : <Maximize size={18} />}
                            >
                                {isExpanded ? 'Contraer' : 'Expandir'}
                            </Button>
                            <Button
                                variant="primary"
                                onClick={handleDownloadPDF}
                                disabled={!pdfPreviewUrl}
                                loading={isDownloading}
                                icon={!isDownloading ? <Download size={18} /> : undefined}
                            >
                                Descargar
                            </Button>
                        </div>
                    </div>

                    {pdfPreviewUrl ? (
                        <div className="flex-1 overflow-hidden rounded-xl border border-slate-200">
                            <iframe
                                src={pdfPreviewUrl}
                                className="w-full h-full min-h-[500px]"
                                title="Previsualización PDF"
                            />
                        </div>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center p-12 text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                            <Info className="w-12 h-12 mb-3 text-slate-300" />
                            <p className="text-center font-medium">No hay datos para mostrar</p>
                            <p className="text-sm text-center mt-1">Selecciona los filtros y genera una vista previa para visualizar los resultados antes de descargar.</p>
                        </div>
                    )}
                </div>
            </div>
        </Card>
    );
}
