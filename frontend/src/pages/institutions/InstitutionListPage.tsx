import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Landmark, ArrowRight, MapPin, Mail, Phone } from 'lucide-react';
import { api } from '../../services/api';
import { DataTable, Column } from '../../components/common/DataTable';
import { Institution } from '../../types/institution';

export const InstitutionListPage: React.FC = () => {
  const navigate = useNavigate();
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchInsts = async () => {
      try {
        const res = await api.get<Institution[]>('/institutions');
        setInstitutions(res.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchInsts();
  }, []);

  const columns: Column<Institution>[] = [
    {
      header: 'Institute ID',
      accessor: (i) => <span className="font-mono text-xs font-bold text-gov-navy-800">{i.code}</span>,
    },
    {
      header: 'Institution Name',
      accessor: (i) => (
        <div>
          <div className="font-semibold text-slate-900">{i.name}</div>
          <div className="text-[10px] text-slate-400">{i.application_ref || 'Permanent Affiliation'}</div>
        </div>
      ),
    },
    {
      header: 'Location',
      accessor: (i) => (
        <span className="flex items-center gap-1 text-slate-600">
          <MapPin className="w-3 h-3 text-slate-400" />
          <span>{i.city}, {i.state}</span>
        </span>
      ),
    },
    {
      header: 'FDR Count',
      accessor: (i) => <span className="font-semibold text-slate-800">{i.total_fdrs ?? 0}</span>,
    },
    {
      header: 'Total Pledged',
      accessor: (i) => (
        <span className="font-semibold text-slate-900">
          ₹{((Number(i.total_deposit_amount) || 0) / 100000).toFixed(2)} L
        </span>
      ),
    },
    {
      header: 'Action',
      accessor: (i) => (
        <button
          onClick={(e) => {
            e.stopPropagation();
            navigate(`/institutions/${i.id}`);
          }}
          className="text-xs text-gov-navy-700 hover:text-gov-navy-900 font-semibold flex items-center gap-1"
        >
          <span>View</span>
          <ArrowRight className="w-3 h-3" />
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Approved Technical Institutions</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Directory of registered colleges, universities, and polytechnics under AICTE jurisdiction.
          </p>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={institutions}
        searchPlaceholder="Search by name, institute code, or state..."
        searchFilter={(item, term) =>
          item.name.toLowerCase().includes(term) ||
          item.code.toLowerCase().includes(term) ||
          item.state.toLowerCase().includes(term) ||
          item.city.toLowerCase().includes(term)
        }
        onRowClick={(item) => navigate(`/institutions/${item.id}`)}
        itemsPerPage={10}
      />
    </div>
  );
};
