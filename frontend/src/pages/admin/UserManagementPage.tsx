import React, { useEffect, useState } from 'react';
import { Users, UserPlus, Shield, CheckCircle, XCircle } from 'lucide-react';
import { api } from '../../services/api';
import { DataTable, Column } from '../../components/common/DataTable';
import { User } from '../../types/auth';

export const UserManagementPage: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const res = await api.get<User[]>('/users');
        setUsers(res.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchUsers();
  }, []);

  const columns: Column<User>[] = [
    {
      header: 'Full Name',
      accessor: (u) => (
        <div>
          <div className="font-semibold text-slate-800">{u.full_name}</div>
          <div className="text-[11px] text-slate-400">{u.email}</div>
        </div>
      ),
    },
    {
      header: 'Assigned Role',
      accessor: (u) => (
        <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gov-navy-50 text-gov-navy-800 border border-gov-navy-200">
          {u.role.replace(/_/g, ' ')}
        </span>
      ),
    },
    { header: 'Designation', accessor: (u) => u.designation || 'N/A' },
    {
      header: 'Status',
      accessor: (u) => (
        <span className={`text-xs font-semibold ${u.is_active ? 'text-emerald-600' : 'text-slate-400'}`}>
          {u.is_active ? 'Active' : 'Inactive'}
        </span>
      ),
    },
    { header: 'Created', accessor: (u) => u.created_at.slice(0, 10) },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">User Identity & Access Management</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Role-based authorization directory for AICTE officers, authorities, and institutional registrars.
          </p>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={users}
        searchPlaceholder="Search users by name, email, or role..."
        searchFilter={(item, term) =>
          item.full_name.toLowerCase().includes(term) ||
          item.email.toLowerCase().includes(term) ||
          item.role.toLowerCase().includes(term)
        }
        itemsPerPage={10}
      />
    </div>
  );
};
