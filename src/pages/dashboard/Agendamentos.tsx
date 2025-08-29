import { useEffect, useState } from 'react';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import { format, isSameDay, parseISO } from 'date-fns';
import { FiCalendar, FiPlus, FiX, FiVideo } from 'react-icons/fi';
import { toast } from "react-toastify";
import { isAfter, isBefore } from 'date-fns';
import { useAuth } from '../../context/AuthContext';

type Playlist = {
    id: string;
    nome: string;
};

type Agendamento = {
    id: number;
    data: string;
    id_playlist: string;
    nome_playlist_principal?: string;
    shuffle: 'sim' | 'nao';
    frequencia: 'Diariamente' | 'Dias da Semana' | 'Somente uma vez';
    finalizacao: 'sim' | 'nao';
    codigo_playlist_finalizacao?: string;
    nome_playlist_finalizacao?: string;
    inicio: string;
    dias_semana?: number[];
};

type ModalData =
    | { type: 'view'; agendamento: Agendamento }
    | { type: 'create'; date: Date | null }
    | null;

export default function CalendarioAvancado() {
    const { getToken } = useAuth();
    const [playlists, setPlaylists] = useState<Playlist[]>([]);
    const [agendamentos, setAgendamentos] = useState<Agendamento[]>([]);
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [modalData, setModalData] = useState<ModalData>(null);
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [filtroDataInicio, setFiltroDataInicio] = useState<string>(''); // yyyy-MM-dd
    const [filtroDataFim, setFiltroDataFim] = useState<string>('');
    const [filtroPlaylist, setFiltroPlaylist] = useState<string>(''); // playlist id

    useEffect(() => {
        fetchPlaylists();
    }, []);

    useEffect(() => {
        fetchAgendamentos(currentMonth);
    }, [currentMonth]);

    async function fetchPlaylists() {
        try {
            const token = await getToken();
            if (!token) {
                throw new Error('Usuário não autenticado');
            }
            const res = await fetch('/api/playlists', {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            });
            if (!res.ok) throw new Error('Erro ao carregar playlists');
            const data: Playlist[] = await res.json();
            setPlaylists(data);
        } catch (error) {
            toast.error((error as Error).message || 'Erro desconhecido');
            console.error(error);
        }
    }

    async function fetchAgendamentos(date: Date) {
        try {
            const token = await getToken();
            if (!token) {
                throw new Error('Usuário não autenticado');
            }
            const mes = format(date, 'yyyy-MM');
            const res = await fetch(`/api/agendamentos?mesAno=${mes}`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            });
            if (!res.ok) throw new Error('Erro ao carregar agendamentos');
            const data: Agendamento[] = await res.json();
            setAgendamentos(data);
        } catch (error) {
            toast.error((error as Error).message || 'Erro desconhecido');
            console.error(error);
        }
    }

    function tileContent({ date, view }: { date: Date; view: string }) {
        if (view === 'month') {
            const ag = agendamentos.find((a) => isSameDay(parseISO(a.data), date));
            if (ag) {
                return (
                    <div className="mt-1 flex justify-center">
                        <span className="bg-blue-500 text-white text-xs px-1 rounded">
                            {ag.id_playlist}
                        </span>
                    </div>
                );
            }
        }
        return null;
    }

    function tileClassName({ date, view }: { date: Date; view: string }) {
        if (view === 'month') {
            if (isSameDay(date, new Date())) {
                return 'bg-blue-100 rounded';
            }
        }
        return '';
    }

    function onDiaClick(date: Date) {
        const ag = agendamentos.find((a) => isSameDay(parseISO(a.data), date));
        if (ag) {
            setModalData({ type: 'view', agendamento: ag });
        } else {
            setModalData({ type: 'create', date });
        }
    }

    function formatFrequencia(agendamento: Agendamento): string {
        if (agendamento.frequencia === 'Dias da Semana' && agendamento.dias_semana) {
            return agendamento.dias_semana
                .map(d => ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁ'][d] || '')
                .join(', ');
        }
        return agendamento.frequencia;
    }

    const agendamentosFiltrados = agendamentos.filter(ag => {
        const dataAg = parseISO(ag.data);

        // Filtra por data início
        if (filtroDataInicio) {
            const dtInicio = parseISO(filtroDataInicio);
            if (isBefore(dataAg, dtInicio)) return false;
        }

        // Filtra por data fim
        if (filtroDataFim) {
            const dtFim = parseISO(filtroDataFim);
            if (isAfter(dataAg, dtFim)) return false;
        }

        // Filtra por playlist
        if (filtroPlaylist && ag.id_playlist !== filtroPlaylist) return false;

        return true;
    });

    const frequenciaLabel: Record<string, string> = {
        diariamente: 'Diariamente',
        dias_da_semana: 'Dias da Semana',
        uma_vez: 'Uma Vez'
    };

    const diasDaSemanaAbrev = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'];

    return (
        <div className="max-w-5xl mx-auto p-6 min-h-screen bg-gray-50">
            {/* HEADER */}
            <header className="flex items-center justify-between bg-gradient-to-r from-blue-600 to-blue-500 p-6 rounded-lg shadow-md mb-6 text-white">
                <h1 className="text-3xl font-extrabold flex items-center gap-3 select-none">
                    <FiCalendar className="w-8 h-8" />
                    Calendário de Agendamentos
                </h1>
                <button
                    onClick={() => setModalData({ type: 'create', date: null })}
                    className="flex items-center gap-2 bg-white text-blue-600 font-semibold rounded-lg px-5 py-3 hover:bg-blue-100 transition-shadow shadow-md hover:shadow-lg"
                    aria-label="Novo Agendamento"
                >
                    <FiPlus className="w-5 h-5" /> Novo Agendamento
                </button>
            </header>

            {/* CALENDÁRIO */}
            <section className="bg-white shadow-lg rounded-lg p-6 w-full">
                <Calendar
                    locale="pt-BR"
                    onChange={(date) => setSelectedDate(date as Date)}
                    value={selectedDate}
                    onActiveStartDateChange={({ activeStartDate }) => {
                        if (activeStartDate) setCurrentMonth(activeStartDate);
                    }}
                    tileContent={tileContent}
                    tileClassName={tileClassName}
                    onClickDay={onDiaClick}
                    className="w-full rounded-md border border-gray-300 hover:shadow-lg transition-shadow"
                />
            </section>

            <section className="mt-6 bg-white shadow-lg rounded-lg p-6">
                <h2 className="text-xl font-semibold mb-4">Filtros de Agendamento</h2>
                <div className="flex flex-col md:flex-row gap-4 items-end">
                    <div>
                        <label className="block mb-1 font-medium">Data Início</label>
                        <input
                            type="date"
                            value={filtroDataInicio}
                            onChange={e => setFiltroDataInicio(e.target.value)}
                            className="border border-gray-300 rounded-md px-3 py-1"
                        />
                    </div>
                    <div>
                        <label className="block mb-1 font-medium">Data Fim</label>
                        <input
                            type="date"
                            value={filtroDataFim}
                            onChange={e => setFiltroDataFim(e.target.value)}
                            className="border border-gray-300 rounded-md px-3 py-1"
                        />
                    </div>
                    <div>
                        <label className="block mb-1 font-medium">Playlist</label>
                        <select
                            value={filtroPlaylist}
                            onChange={e => setFiltroPlaylist(e.target.value)}
                            className="border border-gray-300 rounded-md px-3 py-1"
                        >
                            <option value="">Todas</option>
                            {playlists.map(pl => (
                                <option key={pl.id} value={pl.id}>{pl.nome}</option>
                            ))}
                        </select>
                    </div>
                    <button
                        onClick={() => {
                            // Opcional: limpar filtros
                            setFiltroDataInicio('');
                            setFiltroDataFim('');
                            setFiltroPlaylist('');
                        }}
                        className="text-blue-600 underline ml-auto"
                    >
                        Limpar filtros
                    </button>
                </div>
            </section>

            <section className="mt-6 bg-white shadow-lg rounded-lg p-6 overflow-x-auto">
                <h2 className="text-xl font-semibold mb-4">Agendamentos</h2>

                {agendamentosFiltrados.length === 0 ? (
                    <p className="text-gray-600">Nenhum agendamento encontrado para os filtros selecionados.</p>
                ) : (
                    <table className="w-full border border-gray-300 text-left">
                        <thead className="bg-gray-100">
                            <tr>
                                <th className="px-4 py-2 border-b">ID</th>
                                <th className="px-4 py-2 border-b">Playlist</th>
                                <th className="px-4 py-2 border-b">Misturado</th>
                                <th className="px-4 py-2 border-b">Frequência</th>
                                <th className="px-4 py-2 border-b">Finalização</th>
                                <th className="px-4 py-2 border-b">Início</th>
                            </tr>
                        </thead>
                        <tbody>
                            {agendamentosFiltrados.map(ag => (
                                <tr
                                    key={ag.id}
                                    className="hover:bg-gray-50 cursor-pointer"
                                    onClick={() => setModalData({ type: 'view', agendamento: ag })}
                                >
                                    <td className="px-4 py-2 border-b">{ag.id}</td>
                                    <td className="px-4 py-2 border-b">
                                        {ag.nome_playlist_principal ?? ag.id_playlist}
                                    </td>
                                    <td className="px-4 py-2 border-b">{ag.shuffle === 'sim' ? 'Sim' : 'Não'}</td>
                                    <td className="px-4 py-2 border-b">
                                        {ag.frequencia === 'Dias da Semana' && ag.dias_semana?.length
                                            ? ag.dias_semana
                                                .map(d => diasDaSemanaAbrev[Number(d)] || d)
                                                .join(', ')
                                            : frequenciaLabel[ag.frequencia] ?? ag.frequencia}
                                    </td>
                                    <td className="px-4 py-2 border-b">
                                        {ag.finalizacao === 'sim' ? (ag.nome_playlist_finalizacao ?? '—') : '—'}
                                    </td>
                                    <td className="px-4 py-2 border-b">
                                        {format(parseISO(ag.inicio), 'dd/MM/yyyy HH:mm')}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </section>

            {/* MODAL */}
            <Modal isOpen={modalData !== null} onClose={() => setModalData(null)}>
                {modalData?.type === 'view' && modalData.agendamento && (
                    <div className="space-y-4">
                        <h2 className="text-3xl font-bold text-blue-700 flex items-center gap-3">
                            <FiVideo className="w-8 h-8" />
                            Agendamento #{modalData.agendamento.id}
                        </h2>
                        <div className="space-y-2 text-gray-800">
                            <p>
                                <strong>Playlist ID:</strong> {modalData.agendamento.id_playlist}
                            </p>
                            <p>
                                <strong>Misturar Vídeos:</strong>{' '}
                                {modalData.agendamento.shuffle === 'sim' ? 'Sim' : 'Não'}
                            </p>
                            <p>
                                <strong>Frequência:</strong>{' '}
                                {formatFrequencia(modalData.agendamento)}
                            </p>
                            <p>
                                <strong>Finalização:</strong>{' '}
                                {modalData.agendamento.finalizacao === 'sim' ? 'Sim' : 'Não'}
                            </p>
                            <p>
                                <strong>Código Playlist Finalização:</strong>{' '}
                                {modalData.agendamento.codigo_playlist_finalizacao ?? 'Nenhum'}
                            </p>
                            <p>
                                <strong>Início (hora):</strong>{' '}
                                {format(parseISO(modalData.agendamento.inicio), 'dd/MM/yyyy HH:mm')}
                            </p>
                        </div>
                        <button
                            onClick={() => setModalData(null)}
                            className="mt-4 px-5 py-2 rounded bg-blue-600 text-white font-semibold hover:bg-blue-700 transition"
                        >
                            Fechar
                        </button>
                    </div>
                )}

                {modalData?.type === 'create' && (
                    <NovoAgendamentoForm
                        playlists={playlists}
                        dataSelecionada={modalData.date ?? null}
                        onClose={() => {
                            setModalData(null);
                            fetchAgendamentos(currentMonth);
                        }}
                    />
                )}
            </Modal>
        </div>
    );
}

function Modal({
    isOpen,
    onClose,
    children,
}: {
    isOpen: boolean;
    onClose: () => void;
    children: React.ReactNode;
}) {
    if (!isOpen) return null;
    return (
        <div
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
            onClick={onClose}
            aria-modal="true"
            role="dialog"
        >
            <div
                className="bg-white rounded-lg shadow-xl max-w-3xl w-full p-8 relative"
                onClick={(e) => e.stopPropagation()}
            >
                <button
                    onClick={onClose}
                    aria-label="Fechar modal"
                    className="absolute top-4 right-4 text-gray-600 hover:text-gray-900 transition"
                >
                    <FiX className="w-6 h-6" />
                </button>
                {children}
            </div>
        </div>
    );
}

type NovoAgendamentoFormProps = {
    playlists: Playlist[];
    dataSelecionada: Date | null;
    onClose: () => void;
};

function NovoAgendamentoForm({
    playlists,
    dataSelecionada,
    onClose,
}: NovoAgendamentoFormProps) {
    const { getToken } = useAuth();
    const [playlistId, setPlaylistId] = useState('');
    const [shuffle, setShuffle] = useState<'sim' | 'nao'>('nao');
    const [frequencia, setFrequencia] = useState<
        'Diariamente' | 'Dias da Semana' | 'Somente uma vez'
    >('Diariamente');
    const [diasSemana, setDiasSemana] = useState<number[]>([]);
    const [playlistFinalizacaoId, setPlaylistFinalizacaoId] = useState('');
    const [inicioData, setInicioData] = useState(
        dataSelecionada ? format(dataSelecionada, 'yyyy-MM-dd') : ''
    );
    const [inicioHora, setInicioHora] = useState('00:00');

    function toggleDiaSemana(dia: number) {
        setDiasSemana((old) =>
            old.includes(dia) ? old.filter((d) => d !== dia) : [...old, dia]
        );
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();

        if (!playlistId) {
            alert('Selecione uma playlist');
            return;
        }

        const token = await getToken();
        if (!token) {
            toast.error('Você precisa estar autenticado para criar um agendamento');
            return;
        }

        // Map para transformar o valor do select para o formato aceito no banco
        const frequenciaMap = {
            'Diariamente': 'diariamente',
            'Dias da Semana': 'dias_da_semana',
            'Somente uma vez': 'uma_vez',
        };

        try {
            const dataHoraInicio = `${inicioData} ${inicioHora}:00`;

            const res = await fetch('/api/agendamentos', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({
                    data: inicioData,
                    id_playlist: playlistId,
                    shuffle: shuffle === 'sim',
                    frequencia: frequenciaMap[frequencia],
                    finalizacao: !!playlistFinalizacaoId,
                    id_playlist_finalizacao: playlistFinalizacaoId || null,
                    inicio: dataHoraInicio,
                    dias_semana: frequencia === 'Dias da Semana' ? diasSemana : undefined,
                }),
            });
            if (!res.ok) throw new Error('Erro ao salvar agendamento');

            toast.success('Agendamento criado com sucesso!');
            onClose();
        } catch (error) {
            toast.error('Erro ao criar agendamento');
            console.error(error);
        }
    }

    return (
        <form
            onSubmit={handleSubmit}
            className="space-y-6 text-gray-800"
            autoComplete="off"
        >
            <h2 className="text-3xl font-bold text-blue-700 mb-4 flex items-center gap-2 select-none">
                <FiPlus className="w-7 h-7" />
                Novo Agendamento{' '}
                {dataSelecionada ? `para ${format(dataSelecionada, 'dd/MM/yyyy')}` : ''}
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <label className="block mb-2 font-semibold text-gray-700">
                        Playlist
                    </label>
                    <select
                        value={playlistId}
                        onChange={(e) => setPlaylistId(e.target.value)}
                        required
                        className="w-full border border-gray-300 rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400 transition"
                    >
                        <option value="">Selecione a playlist</option>
                        {playlists.map((pl) => (
                            <option key={pl.id} value={pl.id}>
                                {pl.nome}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="flex items-center space-x-3">
                    <input
                        id="shuffle"
                        type="checkbox"
                        checked={shuffle === 'sim'}
                        onChange={(e) => setShuffle(e.target.checked ? 'sim' : 'nao')}
                        className="w-5 h-5 text-blue-600 rounded border-gray-300 focus:ring-blue-400"
                    />
                    <label
                        htmlFor="shuffle"
                        className="font-semibold cursor-pointer select-none"
                    >
                        Misturar Vídeos
                    </label>
                </div>

                <div>
                    <label className="block mb-2 font-semibold text-gray-700">
                        Frequência
                    </label>
                    <select
                        value={frequencia}
                        onChange={(e) =>
                            setFrequencia(
                                e.target.value as 'Diariamente' | 'Dias da Semana' | 'Somente uma vez'
                            )
                        }
                        className="w-full border border-gray-300 rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400 transition"
                    >
                        <option value="Diariamente">Diariamente</option>
                        <option value="Dias da Semana">Dias da Semana</option>
                        <option value="Somente uma vez">Somente uma vez</option>
                    </select>
                </div>

                {frequencia === 'Dias da Semana' && (
                    <div>
                        <label className="block mb-2 font-semibold text-gray-700">
                            Dias da Semana
                        </label>
                        <div className="flex gap-2 flex-wrap">
                            {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(
                                (dia, i) => (
                                    <button
                                        key={dia}
                                        type="button"
                                        onClick={() => toggleDiaSemana(i)}
                                        className={`px-3 py-1 rounded-md border ${diasSemana.includes(i)
                                            ? 'bg-blue-600 text-white'
                                            : 'border-gray-300 text-gray-700'
                                            } transition`}
                                    >
                                        {dia}
                                    </button>
                                )
                            )}
                        </div>
                    </div>
                )}

                <div>
                    <label className="block mb-2 font-semibold text-gray-700">
                        Playlist Finalização
                    </label>
                    <select
                        value={playlistFinalizacaoId}
                        onChange={(e) => setPlaylistFinalizacaoId(e.target.value)}
                        className="w-full border border-gray-300 rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400 transition"
                    >
                        <option value="">Nenhuma</option>
                        {playlists.map((pl) => (
                            <option key={pl.id} value={pl.id}>
                                {pl.nome}
                            </option>
                        ))}
                    </select>
                </div>

                <div>
                    <label className="block mb-2 font-semibold text-gray-700">
                        Data de Início
                    </label>
                    <input
                        type="date"
                        value={inicioData}
                        onChange={(e) => setInicioData(e.target.value)}
                        required
                        className="w-full border border-gray-300 rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400 transition"
                    />
                </div>

                <div>
                    <label className="block mb-2 font-semibold text-gray-700">
                        Hora de Início
                    </label>
                    <input
                        type="time"
                        value={inicioHora}
                        onChange={(e) => setInicioHora(e.target.value)}
                        required
                        className="w-full border border-gray-300 rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400 transition"
                    />
                </div>
            </div>

            <div className="flex justify-end gap-3">
                <button
                    type="button"
                    onClick={onClose}
                    className="px-5 py-2 rounded-md border border-gray-400 hover:bg-gray-100 transition"
                >
                    Cancelar
                </button>
                <button
                    type="submit"
                    className="px-5 py-2 rounded-md bg-blue-600 text-white font-semibold hover:bg-blue-700 transition"
                >
                    Salvar
                </button>
            </div>
        </form>
    );
}