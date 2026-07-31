'use client';

import { AdminShell } from '@/components/admin/admin-shell';
import { Flag, Search, Shield, Ban, CheckCircle, XCircle, AlertTriangle, MessageSquare, Users, ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/admin/utils/cn';

type ReportType = 'message' | 'profile' | 'guild' | 'comment';
type ReportStatus = 'pending' | 'reviewed' | 'resolved';

const reports: { id: string; type: ReportType; reporter: string; target: string; reason: string; status: ReportStatus; date: string }[] = [
  { id: '1', type: 'message', reporter: 'User_123', target: 'User_456', reason: 'Discurso de ódio', status: 'pending', date: '5min atrás' },
  { id: '2', type: 'profile', reporter: 'User_789', target: 'User_012', reason: 'Nome ofensivo', status: 'pending', date: '15min atrás' },
  { id: '3', type: 'guild', reporter: 'User_345', target: 'Guild [TOXIC]', reason: 'Propaganda', status: 'reviewed', date: '1h atrás' },
  { id: '4', type: 'message', reporter: 'User_678', target: 'User_901', reason: 'Spam', status: 'resolved', date: '3h atrás' },
  { id: '5', type: 'comment', reporter: 'User_234', target: 'Comentário #8921', reason: 'Conteúdo impróprio', status: 'pending', date: '4h atrás' },
];

const typeIcons: Record<ReportType, any> = {
  message: MessageSquare,
  profile: Users,
  guild: Shield,
  comment: MessageSquare,
};

export default function ModerationPage() {
  return (
    <AdminShell>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-heading font-bold text-white">Moderação</h1>
            <p className="text-muted text-sm mt-1">Gerencie denúncias e aplique punições</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/10 text-red-400 text-xs font-medium rounded-full">
              <AlertTriangle size={14} />
              3 pendentes
            </span>
          </div>
        </div>

        <div className="bg-[#0a1122] border border-[rgba(38,51,86,0.7)] rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[rgba(38,51,86,0.5)]">
                <th className="text-left text-xs font-medium text-muted uppercase px-5 py-4">Tipo</th>
                <th className="text-left text-xs font-medium text-muted uppercase px-5 py-4">Denunciante</th>
                <th className="text-left text-xs font-medium text-muted uppercase px-5 py-4">Alvo</th>
                <th className="text-left text-xs font-medium text-muted uppercase px-5 py-4">Motivo</th>
                <th className="text-left text-xs font-medium text-muted uppercase px-5 py-4">Status</th>
                <th className="text-left text-xs font-medium text-muted uppercase px-5 py-4">Data</th>
                <th className="w-32 px-5 py-4" />
              </tr>
            </thead>
            <tbody>
              {reports.map((report) => {
                const Icon = typeIcons[report.type];
                return (
                  <tr key={report.id} className="border-b border-[rgba(38,51,86,0.3)] hover:bg-[rgba(109,40,217,0.04)] transition-colors">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <Icon size={15} className="text-muted" />
                        <span className="text-white text-sm capitalize">{report.type}</span>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-muted text-sm">{report.reporter}</td>
                    <td className="px-5 py-4 text-white text-sm">{report.target}</td>
                    <td className="px-5 py-4 text-muted text-sm">{report.reason}</td>
                    <td className="px-5 py-4">
                      <span className={cn('px-2.5 py-1 rounded-full text-xs font-medium', {
                        'bg-yellow-500/10 text-yellow-400': report.status === 'pending',
                        'bg-blue-500/10 text-blue-400': report.status === 'reviewed',
                        'bg-emerald-500/10 text-emerald-400': report.status === 'resolved',
                      })}>
                        {report.status === 'pending' ? 'Pendente' : report.status === 'reviewed' ? 'Revisado' : 'Resolvido'}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-muted text-sm">{report.date}</td>
                    <td className="px-5 py-4">
                      {report.status === 'pending' && (
                        <div className="flex gap-1">
                          <button className="p-1.5 text-emerald-400 hover:bg-emerald-500/10 rounded transition-colors"><CheckCircle size={16} /></button>
                          <button className="p-1.5 text-red-400 hover:bg-red-500/10 rounded transition-colors"><XCircle size={16} /></button>
                          <button className="p-1.5 text-muted hover:text-white rounded transition-colors"><Ban size={16} /></button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </AdminShell>
  );
}
