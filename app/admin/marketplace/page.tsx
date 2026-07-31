'use client';

import { AdminShell } from '@/components/admin/admin-shell';
import { ShoppingBag, Plus, Tag, Percent, Package } from 'lucide-react';

export default function MarketplacePage() {
  return (
    <AdminShell>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-heading font-bold text-white">Marketplace</h1>
            <p className="text-muted text-sm mt-1">Produtos, cupons e descontos</p>
          </div>
          <div className="flex gap-2">
            <button className="flex items-center gap-2 px-3 py-2 bg-[#0a1122] border border-[rgba(38,51,86,0.7)] rounded-lg text-muted hover:text-white text-sm transition-colors">
              <Tag size={16} />
              Cupons
            </button>
            <button className="flex items-center gap-2 px-4 py-2.5 bg-accent hover:bg-accent-hover text-white rounded-lg text-sm font-medium transition-colors">
              <Plus size={18} />
              Novo Produto
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { name: 'Pacote de XP Boost', price: 'R$ 19,90', sales: 342, revenue: 'R$ 6.805,80' },
            { name: 'Badge Exclusiva', price: 'R$ 9,90', sales: 891, revenue: 'R$ 8.820,90' },
            { name: 'Personalização de Perfil', price: 'R$ 14,90', sales: 567, revenue: 'R$ 8.448,30' },
          ].map((product) => (
            <div key={product.name} className="bg-[#0a1122] border border-[rgba(38,51,86,0.7)] rounded-xl p-5 space-y-3 hover:border-[rgba(168,100,255,0.3)] transition-colors">
              <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
                <Package size={20} className="text-accent" />
              </div>
              <h3 className="text-white font-medium text-sm">{product.name}</h3>
              <p className="text-accent font-heading font-bold text-lg">{product.price}</p>
              <div className="flex justify-between text-xs text-muted">
                <span>{product.sales} vendas</span>
                <span>{product.revenue}</span>
              </div>
            </div>
          ))}
        </div>

        <div className="bg-[#0a1122] border border-[rgba(38,51,86,0.7)] rounded-xl p-5">
          <h3 className="text-white font-heading font-bold text-base mb-4">Cupons Ativos</h3>
          <div className="space-y-3">
            {[
              { code: 'LAUNCH10', discount: '10%', uses: 45, maxUses: 100, expires: '31/12/2026' },
              { code: 'GUILD50', discount: 'R$ 50,00', uses: 12, maxUses: 50, expires: '30/09/2026' },
              { code: 'PREMIUM20', discount: '20%', uses: 78, maxUses: 200, expires: '31/12/2026' },
            ].map((coupon) => (
              <div key={coupon.code} className="flex items-center justify-between py-3 px-4 bg-[rgba(38,51,86,0.2)] rounded-lg">
                <div className="flex items-center gap-3">
                  <Percent size={16} className="text-accent" />
                  <span className="text-white font-mono text-sm font-medium">{coupon.code}</span>
                  <span className="text-accent text-sm font-medium">{coupon.discount}</span>
                </div>
                <div className="flex items-center gap-4 text-xs text-muted">
                  <span>{coupon.uses}/{coupon.maxUses} usos</span>
                  <span>Expira: {coupon.expires}</span>
                  <button className="text-accent hover:text-accent-hover">Editar</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AdminShell>
  );
}
