import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Landmark, ArrowLeft, MapPin, Mail, Phone, FileText } from 'lucide-react';
import { api } from '../../services/api';
import { Institution } from '../../types/institution';
import { FDRInstrument } from '../../types/fdr';
import { DataTable, Column } from '../../components/common/DataTable';
import { StatusBadge } from '../../components/common/StatusBadge';

export const InstitutionDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [institution, setInstitution] = useState<Institution | null>(null);
  const [fdrs, setFdrs] = useState<FDRInstrument[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [resInst, resFdrs] = await Promise.all([
          api.get<Institution>(`/institutions/${id}`),
          api.get<FDRInstrument[]>(`/fdrs?institution_id=${id}`),
        ]);
        setInstitution(resInst.data);
        setFdrs(resFdrs.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  if (loading || !institution) {
    return <div className="p-12 text-center text-slate-500">Loading institution profile...</div>;
  }

  const totalDepositAmount = fdrs.length > 0
    ? fdrs.reduce((acc, curr) => acc + Number(curr.amount || 0), 0)
    : Number(institution.total_deposit_amount || 0);

  const columns: Column<FDRInstrument>[] = [
    {
      header: 'FDR Number',
      accessor: (f) => <span className="font-mono text-xs font-bold text-gov-navy-800">{f.fdr_number}</span>,
    },
    { header: 'Bank', accessor: 'bank_name' },
    {
      header: 'Amount',
      accessor: (f) => <span className="font-semibold">₹{Number(f.amount || 0).toLocaleString('en-IN')}</span>,
    },
    { header: 'Maturity', accessor: 'maturity_date' },
    {
      header: 'Status',
      accessor: (f) => <StatusBadge status={f.validity_status} />,
    },
    {
      header: 'Verification',
      accessor: (f) => <StatusBadge status={f.verification_status} type="verification" />,
    },
  ];

  return (
    <div className="space-y-6">
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        <span>Back to Directory</span>
      </button>

      {/* Institution Header Card */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 bg-gov-navy-50 text-gov-navy-700 font-mono text-xs font-bold rounded">
                {institution.code}
              </span>
              <span className="text-xs text-slate-400">Ref: {institution.application_ref || 'N/A'}</span>
            </div>
            <h2 className="text-xl font-bold text-slate-900 mt-1">{institution.name}</h2>
            <div className="mt-2 flex flex-wrap items-center gap-4 text-xs text-slate-600">
              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                <span>{institution.city}, {institution.state} ({institution.pincode})</span>
              </span>
              <span className="flex items-center gap-1">
                <Mail className="w-3.5 h-3.5 text-slate-400" />
                <span>{institution.contact_email}</span>
              </span>
              <span className="flex items-center gap-1">
                <Phone className="w-3.5 h-3.5 text-slate-400" />
                <span>{institution.contact_phone}</span>
              </span>
            </div>
          </div>

          <div className="text-right">
            <span className="text-xs text-slate-500 uppercase font-semibold">Total Security Pledged</span>
            <div className="text-2xl font-black text-gov-navy-800">
              ₹{(totalDepositAmount / 10000000).toFixed(2)} Cr
            </div>
            <div className="text-xs text-slate-500 font-medium mt-0.5">
              ₹{totalDepositAmount.toLocaleString('en-IN')}
            </div>
          </div>
        </div>
      </div>

      {/* Associated FDRs Table */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
          Pledged Fixed Deposit Instruments ({fdrs.length})
        </h3>
        <DataTable
          columns={columns}
          data={fdrs}
          searchPlaceholder="Search instruments..."
          searchFilter={(item, term) => item.fdr_number.toLowerCase().includes(term)}
          onRowClick={(item) => navigate(`/fdrs/${item.id}`)}
          itemsPerPage={8}
        />
      </div>
    </div>
  );
};
