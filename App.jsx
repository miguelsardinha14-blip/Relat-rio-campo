import React, { useState, useEffect, useMemo } from 'react';
import {
  Home, Users, History, BarChart3, Settings, ChevronRight, Plus, Trash2,
  Edit3, ArrowRightLeft, FileText, Download, Upload, Shield, Moon, Sun,
  CheckCircle2, Lock, Unlock, Copy, Share2, Search, Calendar, Award, Clock, BookOpen
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { Capacitor } from '@capacitor/core';

const INITIAL_GROUPS = [
  {
    id: 'alto-da-serra',
    name: 'Alto da Serra',
    publishers: [
      'Alexandre', 'Angélica', 'Brian', 'Carlos Mesquita', 'Clovis', 'Esmerina',
      'Fernanda Borges', 'Gabriel', 'Geni', 'Glória', 'Lincoln', 'Manuela',
      'Marcos Emanuel', 'Maria Helena', 'Marli', 'Miguel', 'Moyses', 'Renata',
      'Vera', 'Wallace'
    ]
  },
  {
    id: 'euclides-da-cunha',
    name: 'Euclides da Cunha',
    publishers: [
      'Aniceta', 'Armênio', 'Carlos Eduardo', 'Carlos Melani', 'Deise', 'Eliana',
      'Felipe Pimparel', 'Fernanda Alves', 'Florinda', 'Gabriela Pimparel',
      'Genésio Casemiro', 'Herica', 'Isabela Pimparel', 'Luiza Pimparel',
      'Maria Luiza', 'Norma', 'Rita de Alencar', 'Rosana Pereira', 'Rosemeire',
      'Roseni', 'Vanda'
    ]
  },
  {
    id: 'lopes-trovao',
    name: 'Lopes Trovão',
    publishers: [
      'Agamemon', 'Carlos Adriano', 'Elisabeth', 'Emerson', 'Emily', 'Fábio Lopes',
      'Fernanda Rodrigues', 'François', 'Inez', 'José Americo', 'Juliana Veiga',
      'Maria Targino', 'Marilene', 'Matheus', 'Pedro Lucas', 'Roselaine',
      'Vitória', 'Zilma'
    ]
  },
  {
    id: 'sargento-boening',
    name: 'Sargento Boening',
    publishers: [
      'Ana Paula', 'Carine', 'Carmem Lúcia', 'Claudia', 'Eleonora', 'Eny',
      'Ermelinda', 'Genésio Francisco', 'Guilherme', 'Herminio', 'Isabel Barbosa',
      'Kamilly', 'Karla', 'Lorena', 'Mariana', 'Marisa', 'Olinda',
      'Paulo Roberto', 'Renan', 'Tatiana'
    ]
  }
];

const MONTHS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

const STORAGE_KEY = 'jw_relatorio_campo_v1';

function buildInitialState() {
  const groups = INITIAL_GROUPS.map(g => ({ id: g.id, name: g.name }));
  const publishers = [];
  INITIAL_GROUPS.forEach(g => {
    g.publishers.forEach((name, idx) => {
      publishers.push({
        id: `${g.id}-${idx}-${name.toLowerCase().replace(/\s+/g, '-')}`,
        name,
        groupId: g.id
      });
    });
  });
  return {
    congregation: 'Congregação Alto da Serra — Petrópolis/RJ',
    pin: '',
    darkMode: false,
    groups,
    publishers,
    reports: {} // chave: "YYYY-MM" -> { [publisherId]: { regular, auxiliary, preached, studies, hours } }
  };
}

export default function App() {
  const [data, setData] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : buildInitialState();
    } catch {
      return buildInitialState();
    }
  });

  const [tab, setTab] = useState('home');
  const [selectedYear, setSelectedYear] = useState(2026);
  const [selectedMonth, setSelectedMonth] = useState(11); // Novembro = 11
  const [selectedGroupId, setSelectedGroupId] = useState('alto-da-serra');
  const [unlocked, setUnlocked] = useState(true);
  const [pinInput, setPinInput] = useState('');
  const [saveIndicator, setSaveIndicator] = useState('Salvo automaticamente');

  useEffect(() => {
    if (data.pin && unlocked === true && sessionStorage.getItem('unlocked') !== '1') {
      setUnlocked(false);
    }
  }, []);

  // Salvamento automático instantâneo em armazenamento permanente local
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      setSaveIndicator('Salvo localmente');
    } catch (e) {
      setSaveIndicator('Erro ao salvar');
    }
  }, [data]);

  const monthKey = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}`;
  const currentMonthReports = data.reports[monthKey] || {};

  const updateEntry = (pubId, field, value) => {
    setData(prev => {
      const mRep = prev.reports[monthKey] || {};
      const current = mRep[pubId] || {
        regular: false,
        auxiliary: false,
        preached: false,
        studies: 0,
        hours: 0
      };
      const updated = { ...current, [field]: value };
      if ((field === 'regular' || field === 'auxiliary') && value === true) {
        updated.preached = true;
      }
      if (field === 'regular' && value === true) updated.auxiliary = false;
      if (field === 'auxiliary' && value === true) updated.regular = false;

      return {
        ...prev,
        reports: {
          ...prev.reports,
          [monthKey]: {
            ...mRep,
            [pubId]: updated
          }
        }
      };
    });
  };

  const computeStats = (groupId = null, targetMonthKey = monthKey) => {
    const mRep = data.reports[targetMonthKey] || {};
    const pubs = groupId
      ? data.publishers.filter(p => p.groupId === groupId)
      : data.publishers;

    let regular = 0;
    let auxiliary = 0;
    let reported = 0;
    let studies = 0;
    let hours = 0;

    pubs.forEach(p => {
      const r = mRep[p.id];
      if (!r) return;
      if (r.regular) regular += 1;
      if (r.auxiliary) auxiliary += 1;
      const didReport = Boolean(r.preached || r.regular || r.auxiliary || Number(r.hours) > 0 || Number(r.studies) > 0);
      if (didReport) reported += 1;
      studies += Number(r.studies) || 0;
      hours += Number(r.hours) || 0;
    });

    return {
      totalPublishers: pubs.length,
      regular,
      auxiliary,
      reported,
      studies,
      hours
    };
  };

  const exportGroupPDF = async (groupId, targetYear = selectedYear, targetMonth = selectedMonth) => {
    const group = data.groups.find(g => g.id === groupId);
    if (!group) return;
    const mKey = `${targetYear}-${String(targetMonth).padStart(2, '0')}`;
    const stats = computeStats(groupId, mKey);
    const pubs = data.publishers
      .filter(p => p.groupId === groupId)
      .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
    const mRep = data.reports[mKey] || {};

    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    doc.setFillColor(15, 37, 68);
    doc.rect(0, 0, 210, 32, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('RELATÓRIO MENSAL DE SERVIÇO DE CAMPO', 14, 14);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`${data.congregation}`, 14, 21);
    doc.text(`Grupo: ${group.name}   |   Período: ${MONTHS[targetMonth - 1]} de ${targetYear}`, 14, 27);

    doc.setTextColor(15, 37, 68);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(
      `Publicadores: ${stats.totalPublishers}  |  P. Regulares: ${stats.regular}  |  P. Auxiliares: ${stats.auxiliary}  |  Relataram: ${stats.reported}  |  Estudos: ${stats.studies}  |  Horas: ${stats.hours}`,
      14,
      40
    );

    const rows = pubs.map(p => {
      const r = mRep[p.id] || {};
      const didReport = Boolean(r.preached || r.regular || r.auxiliary || Number(r.hours) > 0 || Number(r.studies) > 0);
      return [
        p.name,
        r.regular ? 'Sim' : '-',
        r.auxiliary ? 'Sim' : '-',
        didReport ? 'Sim' : '-',
        String(Number(r.studies) || 0),
        String(Number(r.hours) || 0)
      ];
    });

    autoTable(doc, {
      startY: 45,
      head: [['Nome', 'P. Regular', 'P. Auxiliar', 'Pregou', 'Estudos', 'Horas']],
      body: rows,
      foot: [[
        'TOTAIS DO GRUPO',
        String(stats.regular),
        String(stats.auxiliary),
        String(stats.reported),
        String(stats.studies),
        String(stats.hours)
      ]],
      theme: 'grid',
      headStyles: { fillColor: [15, 37, 68], textColor: 255, fontStyle: 'bold' },
      footStyles: { fillColor: [226, 232, 240], textColor: [15, 37, 68], fontStyle: 'bold' },
      styles: { fontSize: 9, cellPadding: 2.5 },
      columnStyles: {
        1: { halign: 'center' },
        2: { halign: 'center' },
        3: { halign: 'center' },
        4: { halign: 'center' },
        5: { halign: 'center' }
      },
      didDrawPage: (d) => {
        const pageCount = doc.internal.getNumberOfPages();
        doc.setFontSize(8);
        doc.setTextColor(100);
        doc.text(`Página ${d.pageNumber} de ${pageCount}`, 196, 290, { align: 'right' });
      }
    });

    const slug = group.name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, '_');
    const fileName = `Relatorio_${slug}_${String(targetMonth).padStart(2, '0')}-${targetYear}.pdf`;

    if (Capacitor.isNativePlatform()) {
      const base64 = doc.output('datauristring').split(',')[1];
      const savedFile = await Filesystem.writeFile({
        path: fileName,
        data: base64,
        directory: Directory.Cache
      });
      await Share.share({
        title: fileName,
        text: `Relatório de Serviço de Campo — ${group.name} (${MONTHS[targetMonth - 1]}/${targetYear})`,
        url: savedFile.uri,
        dialogTitle: 'Compartilhar ou Salvar Relatório PDF'
      });
    } else {
      doc.save(fileName);
    }
  };

  if (!unlocked) {
    return (
      <div className="min-h-screen bg-[#0F2544] text-white flex flex-col items-center justify-center p-6">
        <Lock className="w-12 h-12 text-sky-400 mb-4" />
        <h1 className="text-xl font-bold mb-1">Relatório de Campo</h1>
        <p className="text-xs text-slate-300 mb-6">{data.congregation}</p>
        <input
          type="password"
          inputMode="numeric"
          maxLength={6}
          value={pinInput}
          onChange={e => setPinInput(e.target.value)}
          placeholder="Digite o PIN de acesso"
          className="w-full max-w-xs text-center text-lg tracking-widest py-3 px-4 rounded-xl bg-white/10 border border-white/20 text-white mb-4"
        />
        <button
          onClick={() => {
            if (pinInput === data.pin) {
              sessionStorage.setItem('unlocked', '1');
              setUnlocked(true);
            } else {
              alert('PIN incorreto.');
            }
          }}
          className="w-full max-w-xs py-3 rounded-xl bg-emerald-600 font-semibold"
        >
          Desbloquear Aplicativo
        </button>
      </div>
    );
  }

  const globalStats = computeStats(null);
  const activeGroup = data.groups.find(g => g.id === selectedGroupId) || data.groups[0];
  const activeGroupStats = computeStats(activeGroup?.id);
  const groupPublishers = data.publishers
    .filter(p => p.groupId === activeGroup?.id)
    .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));

  return (
    <div className={data.darkMode ? 'dark bg-slate-950 text-slate-100 min-h-screen pb-24' : 'bg-slate-50 text-slate-900 min-h-screen pb-24'}>
      {/* Cabeçalho Superior */}
      <header className="bg-[#0F2544] text-white px-4 pt-4 pb-5 rounded-b-3xl shadow-md sticky top-0 z-20">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold tracking-tight">Relatório de Campo</h1>
            <p className="text-xs text-sky-200">{data.congregation}</p>
          </div>
          <span className="text-[11px] bg-emerald-600/90 px-2.5 py-1 rounded-full font-medium">
            {saveIndicator}
          </span>
        </div>

        {/* Seletor Rápido de Mês e Ano */}
        <div className="mt-3 flex gap-2">
          <select
            value={selectedMonth}
            onChange={e => setSelectedMonth(Number(e.target.value))}
            className="flex-1 bg-white/15 text-white text-sm font-semibold py-2 px-3 rounded-xl border border-white/15"
          >
            {MONTHS.map((m, i) => (
              <option key={m} value={i + 1} className="text-slate-900">{m}</option>
            ))}
          </select>
          <select
            value={selectedYear}
            onChange={e => setSelectedYear(Number(e.target.value))}
            className="w-28 bg-white/15 text-white text-sm font-semibold py-2 px-3 rounded-xl border border-white/15"
          >
            {[2025, 2026, 2027, 2028].map(y => (
              <option key={y} value={y} className="text-slate-900">{y}</option>
            ))}
          </select>
        </div>
      </header>

      <main className="p-4 max-w-xl mx-auto space-y-4">
        {/* ABA 1: INÍCIO */}
        {tab === 'home' && (
          <>
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 shadow-sm border border-slate-200/80 dark:border-slate-800">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-bold text-[#0F2544] dark:text-sky-300 uppercase tracking-wider">
                  Resumo Geral • {MONTHS[selectedMonth - 1]}/{selectedYear}
                </h2>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="bg-slate-50 dark:bg-slate-800 p-2.5 rounded-xl">
                  <div className="text-lg font-extrabold text-[#0F2544] dark:text-white">{globalStats.reported}/{globalStats.totalPublishers}</div>
                  <div className="text-[11px] text-slate-500">Relataram</div>
                </div>
                <div className="bg-slate-50 dark:bg-slate-800 p-2.5 rounded-xl">
                  <div className="text-lg font-extrabold text-sky-600">{globalStats.hours}</div>
                  <div className="text-[11px] text-slate-500">Horas</div>
                </div>
                <div className="bg-slate-50 dark:bg-slate-800 p-2.5 rounded-xl">
                  <div className="text-lg font-extrabold text-emerald-600">{globalStats.studies}</div>
                  <div className="text-[11px] text-slate-500">Estudos</div>
                </div>
              </div>
            </div>

            <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 px-1">Grupos de Serviço de Campo</h3>
            <div className="grid grid-cols-1 gap-3">
              {data.groups.map(group => {
                const st = computeStats(group.id);
                return (
                  <button
                    key={group.id}
                    onClick={() => {
                      setSelectedGroupId(group.id);
                      setTab('groups');
                    }}
                    className="w-full text-left bg-white dark:bg-slate-900 p-4 rounded-2xl shadow-sm border border-slate-200/80 dark:border-slate-800 flex items-center justify-between active:scale-[0.99] transition"
                  >
                    <div>
                      <div className="font-bold text-base text-[#0F2544] dark:text-white">{group.name}</div>
                      <div className="text-xs text-slate-500 mt-1">
                        {st.reported} de {st.totalPublishers} relataram • {st.hours}h • {st.studies} estudos
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-sky-600" />
                  </button>
                );
              })}
            </div>
          </>
        )}

        {/* ABA 2: GRUPOS E LANÇAMENTO MENSAL */}
        {tab === 'groups' && activeGroup && (
          <>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {data.groups.map(g => (
                <button
                  key={g.id}
                  onClick={() => setSelectedGroupId(g.id)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition ${
                    g.id === activeGroup.id
                      ? 'bg-[#0F2544] text-white'
                      : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800'
                  }`}
                >
                  {g.name}
                </button>
              ))}
            </div>

            {/* Painel de Contagem Automática */}
            <div className="bg-[#0F2544] text-white rounded-2xl p-4 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <span className="font-bold text-sm">{activeGroup.name}</span>
                <span className="text-xs text-sky-200">{MONTHS[selectedMonth - 1]} {selectedYear}</span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="bg-white/10 rounded-xl p-2">
                  <div className="text-base font-bold">{activeGroupStats.totalPublishers}</div>
                  <div className="text-[10px] text-sky-200">Publicadores</div>
                </div>
                <div className="bg-white/10 rounded-xl p-2">
                  <div className="text-base font-bold">{activeGroupStats.regular}</div>
                  <div className="text-[10px] text-sky-200">P. Regulares</div>
                </div>
                <div className="bg-white/10 rounded-xl p-2">
                  <div className="text-base font-bold">{activeGroupStats.auxiliary}</div>
                  <div className="text-[10px] text-sky-200">P. Auxiliares</div>
                </div>
                <div className="bg-white/10 rounded-xl p-2">
                  <div className="text-base font-bold text-emerald-300">{activeGroupStats.reported}</div>
                  <div className="text-[10px] text-sky-200">Relataram</div>
                </div>
                <div className="bg-white/10 rounded-xl p-2">
                  <div className="text-base font-bold">{activeGroupStats.studies}</div>
                  <div className="text-[10px] text-sky-200">Estudos</div>
                </div>
                <div className="bg-white/10 rounded-xl p-2">
                  <div className="text-base font-bold">{activeGroupStats.hours}</div>
                  <div className="text-[10px] text-sky-200">Horas</div>
                </div>
              </div>

              <button
                onClick={() => exportGroupPDF(activeGroup.id)}
                className="mt-3 w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm flex items-center justify-center gap-2 shadow"
              >
                <FileText className="w-4 h-4" />
                Exportar relatório em PDF
              </button>
            </div>

            {/* Lista de Publicadores */}
            <div className="space-y-3">
              {groupPublishers.map(pub => {
                const entry = currentMonthReports[pub.id] || {
                  regular: false,
                  auxiliary: false,
                  preached: false,
                  studies: 0,
                  hours: 0
                };
                return (
                  <div
                    key={pub.id}
                    className="bg-white dark:bg-slate-900 rounded-2xl p-4 shadow-sm border border-slate-200/80 dark:border-slate-800 space-y-3"
                  >
                    <div className="font-bold text-base text-[#0F2544] dark:text-white">{pub.name}</div>

                    <div className="grid grid-cols-3 gap-2">
                      <label className={`flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-xl border text-xs font-semibold cursor-pointer ${entry.regular ? 'bg-sky-50 border-sky-500 text-sky-800' : 'border-slate-200 dark:border-slate-700'}`}>
                        <input
                          type="checkbox"
                          checked={Boolean(entry.regular)}
                          onChange={e => updateEntry(pub.id, 'regular', e.target.checked)}
                          className="w-4 h-4 accent-sky-600"
                        />
                        P. Regular
                      </label>

                      <label className={`flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-xl border text-xs font-semibold cursor-pointer ${entry.auxiliary ? 'bg-sky-50 border-sky-500 text-sky-800' : 'border-slate-200 dark:border-slate-700'}`}>
                        <input
                          type="checkbox"
                          checked={Boolean(entry.auxiliary)}
                          onChange={e => updateEntry(pub.id, 'auxiliary', e.target.checked)}
                          className="w-4 h-4 accent-sky-600"
                        />
                        P. Auxiliar
                      </label>

                      <label className={`flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-xl border text-xs font-semibold cursor-pointer ${entry.preached ? 'bg-emerald-50 border-emerald-500 text-emerald-800' : 'border-slate-200 dark:border-slate-700'}`}>
                        <input
                          type="checkbox"
                          checked={Boolean(entry.preached)}
                          onChange={e => updateEntry(pub.id, 'preached', e.target.checked)}
                          className="w-4 h-4 accent-emerald-600"
                        />
                        Pregou
                      </label>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-500 mb-1">Estudos Bíblicos</label>
                        <input
                          type="number"
                          min="0"
                          inputMode="numeric"
                          value={entry.studies === 0 ? '' : entry.studies}
                          placeholder="0"
                          onChange={e => updateEntry(pub.id, 'studies', Math.max(0, parseInt(e.target.value || '0', 10)))}
                          className="w-full py-2.5 px-3 rounded-xl border border-slate-300 dark:border-slate-700 dark:bg-slate-800 text-base font-bold text-center"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-500 mb-1">Horas</label>
                        <input
                          type="number"
                          min="0"
                          inputMode="numeric"
                          value={entry.hours === 0 ? '' : entry.hours}
                          placeholder="0"
                          onChange={e => updateEntry(pub.id, 'hours', Math.max(0, parseInt(e.target.value || '0', 10)))}
                          className="w-full py-2.5 px-3 rounded-xl border border-slate-300 dark:border-slate-700 dark:bg-slate-800 text-base font-bold text-center"
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* ABA 3: HISTÓRICO */}
        {tab === 'history' && (
          <div className="space-y-3">
            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
              <h2 className="font-bold text-base text-[#0F2544] dark:text-white mb-2">Histórico de Relatórios ({selectedYear})</h2>
              <p className="text-xs text-slate-500 mb-3">
                Abra qualquer mês para consultar, exportar em PDF ou iniciar o mês atual zerando horas e estudos.
              </p>
              <button
                onClick={() => {
                  setData(prev => ({
                    ...prev,
                    reports: {
                      ...prev.reports,
                      [monthKey]: {}
                    }
                  }));
                  alert(`Relatório de ${MONTHS[selectedMonth - 1]}/${selectedYear} preparado com horas e estudos zerados, preservando todos os publicadores.`);
                }}
                className="w-full py-2.5 px-3 rounded-xl bg-sky-600 text-white text-xs font-bold flex items-center justify-center gap-2"
              >
                <Copy className="w-4 h-4" />
                Iniciar {MONTHS[selectedMonth - 1]}/{selectedYear} com campos zerados
              </button>
            </div>

            {MONTHS.map((mName, idx) => {
              const mNum = idx + 1;
              const k = `${selectedYear}-${String(mNum).padStart(2, '0')}`;
              const st = computeStats(null, k);
              return (
                <div key={k} className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-bold text-sm text-[#0F2544] dark:text-white">{mName} {selectedYear}</div>
                      <div className="text-xs text-slate-500 mt-0.5">
                        {st.reported} relataram • {st.hours}h • {st.studies} estudos
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setSelectedMonth(mNum);
                        setTab('groups');
                      }}
                      className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-xs font-bold text-[#0F2544] dark:text-sky-300"
                    >
                      Abrir
                    </button>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {data.groups.map(g => (
                      <button
                        key={g.id}
                        onClick={() => exportGroupPDF(g.id, selectedYear, mNum)}
                        className="text-[11px] px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 font-semibold border border-emerald-200"
                      >
                        PDF {g.name}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ABA 4: VISÃO GERAL */}
        {tab === 'overview' && (
          <div className="space-y-4">
            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
              <h2 className="font-bold text-base text-[#0F2544] dark:text-white mb-3">
                Consolidado da Congregação • {MONTHS[selectedMonth - 1]}/{selectedYear}
              </h2>
              <div className="grid grid-cols-2 gap-2.5 text-sm">
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800">
                  <div className="text-xs text-slate-500">Publicadores Cadastrados</div>
                  <div className="text-xl font-extrabold text-[#0F2544] dark:text-white">{globalStats.totalPublishers}</div>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800">
                  <div className="text-xs text-slate-500">Publicadores que Relataram</div>
                  <div className="text-xl font-extrabold text-emerald-600">{globalStats.reported}</div>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800">
                  <div className="text-xs text-slate-500">Pioneiros Regulares</div>
                  <div className="text-xl font-extrabold text-sky-600">{globalStats.regular}</div>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800">
                  <div className="text-xs text-slate-500">Pioneiros Auxiliares</div>
                  <div className="text-xl font-extrabold text-sky-600">{globalStats.auxiliary}</div>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800">
                  <div className="text-xs text-slate-500">Total de Estudos Bíblicos</div>
                  <div className="text-xl font-extrabold text-[#0F2544] dark:text-white">{globalStats.studies}</div>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800">
                  <div className="text-xs text-slate-500">Total de Horas</div>
                  <div className="text-xl font-extrabold text-[#0F2544] dark:text-white">{globalStats.hours}</div>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
              <h3 className="font-bold text-sm text-[#0F2544] dark:text-white">Desempenho por Grupo</h3>
              {data.groups.map(g => {
                const st = computeStats(g.id);
                const pct = st.totalPublishers > 0 ? Math.round((st.reported / st.totalPublishers) * 100) : 0;
                return (
                  <div key={g.id} className="space-y-1">
                    <div className="flex justify-between text-xs font-semibold">
                      <span>{g.name}</span>
                      <span>{st.reported}/{st.totalPublishers} ({pct}%) • {st.hours}h</span>
                    </div>
                    <div className="w-full h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-600 rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ABA 5: CONFIGURAÇÕES E GERENCIAMENTO */}
        {tab === 'settings' && (
          <SettingsView data={data} setData={setData} />
        )}
      </main>

      {/* Barra de Navegação Inferior (5 abas) */}
      <nav className="fixed bottom-0 inset-x-0 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 px-2 py-2 flex justify-around z-30">
        {[
          { id: 'home', label: 'Início', Icon: Home },
          { id: 'groups', label: 'Grupos', Icon: Users },
          { id: 'history', label: 'Histórico', Icon: History },
          { id: 'overview', label: 'Visão Geral', Icon: BarChart3 },
          { id: 'settings', label: 'Configurações', Icon: Settings }
        ].map(({ id, label, Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex flex-col items-center gap-1 px-2 py-1 rounded-xl text-[11px] font-semibold ${
              tab === id ? 'text-[#0F2544] dark:text-sky-400' : 'text-slate-400'
            }`}
          >
            <Icon className="w-5 h-5" />
            <span>{label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}

function SettingsView({ data, setData }) {
  const [newName, setNewName] = useState('');
  const [targetGroup, setTargetGroup] = useState(data.groups[0]?.id || '');

  const addPublisher = () => {
    const trimmed = newName.trim();
    if (!trimmed) return;
    setData(prev => ({
      ...prev,
      publishers: [
        ...prev.publishers,
        { id: `pub-${Date.now()}`, name: trimmed, groupId: targetGroup }
      ]
    }));
    setNewName('');
  };

  const removePublisher = (pub) => {
    if (!window.confirm(`Deseja realmente excluir ${pub.name}?`)) return;
    setData(prev => ({
      ...prev,
      publishers: prev.publishers.filter(p => p.id !== pub.id)
    }));
  };

  const transferPublisher = (pubId, newGroupId) => {
    setData(prev => ({
      ...prev,
      publishers: prev.publishers.map(p => (p.id === pubId ? { ...p, groupId: newGroupId } : p))
    }));
  };

  const editPublisher = (pub) => {
    const updated = window.prompt('Editar nome do publicador:', pub.name);
    if (!updated || !updated.trim()) return;
    setData(prev => ({
      ...prev,
      publishers: prev.publishers.map(p => (p.id === pub.id ? { ...p, name: updated.trim() } : p))
    }));
  };

  const exportBackup = () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Backup_Relatorio_Campo_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
  };

  const importBackup = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result);
        if (parsed.groups && parsed.publishers) {
          setData(parsed);
          alert('Backup restaurado com sucesso!');
        }
      } catch {
        alert('Arquivo de backup inválido.');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-4">
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
        <h2 className="font-bold text-base text-[#0F2544] dark:text-white">Congregação e Aparência</h2>
        <input
          type="text"
          value={data.congregation}
          onChange={e => setData(prev => ({ ...prev, congregation: e.target.value }))}
          className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 dark:bg-slate-800 text-sm"
        />
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Tema Escuro</span>
          <button
            onClick={() => setData(prev => ({ ...prev, darkMode: !prev.darkMode }))}
            className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-bold"
          >
            {data.darkMode ? 'Ativado' : 'Desativado'}
          </button>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">PIN de Segurança</span>
          <input
            type="password"
            maxLength={6}
            placeholder="Opcional"
            value={data.pin || ''}
            onChange={e => setData(prev => ({ ...prev, pin: e.target.value }))}
            className="w-28 p-2 rounded-xl border border-slate-300 dark:border-slate-700 dark:bg-slate-800 text-sm text-center"
          />
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
        <h2 className="font-bold text-base text-[#0F2544] dark:text-white">Adicionar Publicador</h2>
        <input
          type="text"
          placeholder="Nome completo do publicador"
          value={newName}
          onChange={e => setNewName(e.target.value)}
          className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 dark:bg-slate-800 text-sm"
        />
        <div className="flex gap-2">
          <select
            value={targetGroup}
            onChange={e => setTargetGroup(e.target.value)}
            className="flex-1 p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 dark:bg-slate-800 text-sm"
          >
            {data.groups.map(g => (
              <option key={g.id} value={g.id}>{g.name}</option>
            ))}
          </select>
          <button onClick={addPublisher} className="px-4 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-bold">
            Adicionar
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
        <h2 className="font-bold text-base text-[#0F2544] dark:text-white">Backup e Restauração</h2>
        <div className="grid grid-cols-2 gap-2">
          <button onClick={exportBackup} className="py-2.5 px-3 rounded-xl bg-[#0F2544] text-white text-xs font-bold">
            Exportar Backup
          </button>
          <label className="py-2.5 px-3 rounded-xl bg-sky-600 text-white text-xs font-bold text-center cursor-pointer">
            Importar Backup
            <input type="file" accept=".json" onChange={importBackup} className="hidden" />
          </label>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2">
        <h2 className="font-bold text-base text-[#0F2544] dark:text-white">
          Gerenciar Publicadores ({data.publishers.length})
        </h2>
        <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
          {data.publishers
            .slice()
            .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))
            .map(pub => (
              <div key={pub.id} className="py-2.5 flex items-center justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold truncate">{pub.name}</div>
                  <select
                    value={pub.groupId}
                    onChange={e => transferPublisher(pub.id, e.target.value)}
                    className="text-xs text-slate-500 bg-transparent"
                  >
                    {data.groups.map(g => (
                      <option key={g.id} value={g.id}>{g.name}</option>
                    ))}
                  </select>
                </div>
                <button onClick={() => editPublisher(pub)} className="p-1.5 text-sky-600 text-xs font-bold">Editar</button>
                <button onClick={() => removePublisher(pub)} className="p-1.5 text-rose-600 text-xs font-bold">Excluir</button>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}
