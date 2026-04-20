import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Users } from 'lucide-react';
import api from '../services/api';
import useToast from '../hooks/useToast';
import ConfirmModal from '../components/ConfirmModal';
import Pagination from '../components/Pagination';
import { isSuperAdmin } from '../utils/auth';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import FormField from '../components/ui/FormField';
import EmptyState from '../components/ui/EmptyState';
import Spinner from '../components/ui/Spinner';
import Table from '../components/ui/Table';
import { cn } from '../components/ui/cn';

const getStatusBadge = (expiryDate) => {
  if (!expiryDate) return { label: 'Lifetime', variant: 'info' };
  const now = new Date();
  const expiry = new Date(expiryDate);
  const sevenDaysLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  if (expiry < now) return { label: 'Expired', variant: 'danger' };
  if (expiry <= sevenDaysLater) return { label: 'Expiring Soon', variant: 'warning' };
  return { label: 'Active', variant: 'success' };
};

const getPaymentBadge = (member) => {
  if (member.dueAmount === 0) return { label: 'Paid', variant: 'success' };
  if (member.dueAmount === member.totalAmount) return { label: 'Unpaid', variant: 'danger' };
  return { label: 'Partial', variant: 'warning' };
};

const PAYMENT_DOT = {
  success: 'bg-accent-500',
  warning: 'bg-amber-500',
  danger: 'bg-red-500',
};

const MembersList = () => {
  const { showSuccess, showError } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || '');
  const [deletingId, setDeletingId] = useState(null);
  const [tab, setTab] = useState(searchParams.get('tab') || 'all');
  const [pendingMembers, setPendingMembers] = useState([]);
  const [pendingLoading, setPendingLoading] = useState(false);
  const [rejectingId, setRejectingId] = useState(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const LIMIT = 20;

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter]);

  useEffect(() => {
    fetchMembers();
  }, [search, statusFilter, page]);

  useEffect(() => {
    if (isSuperAdmin()) {
      fetchPending();
    }
  }, []);

  useEffect(() => {
    if (tab === 'pending' && isSuperAdmin()) {
      fetchPending();
    }
  }, [tab]);

  const fetchMembers = async () => {
    try {
      const params = { page, limit: LIMIT };
      if (search) params.search = search;
      if (statusFilter) params.status = statusFilter;

      const res = await api.get('/members', { params });
      setMembers(res.data.data);
      setTotalPages(res.data.pagination?.totalPages || 1);
    } catch (error) {
      console.error('Error fetching members:', error);
      showError('Failed to load members.');
    } finally {
      setLoading(false);
    }
  };

  const fetchPending = async () => {
    setPendingLoading(true);
    try {
      const res = await api.get('/members/pending');
      setPendingMembers(res.data.data);
    } catch (error) {
      console.error('Error fetching pending members:', error);
      showError('Failed to load pending members.');
    } finally {
      setPendingLoading(false);
    }
  };

  const handleApprove = async (id) => {
    try {
      await api.put(`/members/${id}/approve`);
      showSuccess('Member approved');
      setPendingMembers((prev) => prev.filter((m) => m._id !== id));
      fetchMembers();
    } catch (error) {
      console.error('Error approving member:', error);
      showError('Failed to approve member.');
    }
  };

  const handleReject = async (id) => {
    try {
      await api.delete(`/members/${id}/reject`);
      showSuccess('Member rejected');
      setPendingMembers((prev) => prev.filter((m) => m._id !== id));
    } catch (error) {
      console.error('Error rejecting member:', error);
      showError('Failed to reject member.');
    } finally {
      setRejectingId(null);
    }
  };

  const switchTab = (newTab) => {
    setTab(newTab);
    const params = new URLSearchParams(searchParams);
    if (newTab === 'all') {
      params.delete('tab');
    } else {
      params.set('tab', newTab);
    }
    setSearchParams(params, { replace: true });
  };

  const confirmDelete = async (id) => {
    try {
      await api.delete(`/members/${id}`);
      showSuccess('Member deleted');
      fetchMembers();
    } catch (error) {
      console.error('Error deleting member:', error);
      showError('Failed to delete member.');
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <Card padding="lg">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold text-slate-900 dark:text-slate-100">Members</h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              View and manage your member list with clear controls.
            </p>
          </div>
          <Button variant="primary" to="/members/add">
            Add Member
          </Button>
        </div>

        {isSuperAdmin() && (
          <div className="mt-6 flex gap-1 border-b border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={() => switchTab('all')}
              className={cn(
                '-mb-px px-4 py-2.5 text-sm font-medium transition',
                tab === 'all'
                  ? 'border-b-2 border-brand-600 text-brand-700 dark:border-brand-400 dark:text-brand-300'
                  : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200',
              )}
            >
              All Members
            </button>
            <button
              type="button"
              onClick={() => switchTab('pending')}
              className={cn(
                '-mb-px flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition',
                tab === 'pending'
                  ? 'border-b-2 border-amber-600 text-amber-700 dark:border-amber-400 dark:text-amber-300'
                  : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200',
              )}
            >
              Pending Approval
              {pendingMembers.length > 0 && tab !== 'pending' && (
                <Badge variant="warning" size="sm">
                  {pendingMembers.length}
                </Badge>
              )}
            </button>
          </div>
        )}
      </Card>

      {tab === 'pending' && isSuperAdmin() ? (
        <Card padding="md">
          {pendingLoading ? (
            <div className="flex items-center justify-center py-12">
              <Spinner size="lg" />
            </div>
          ) : pendingMembers.length === 0 ? (
            <EmptyState
              title="No pending approvals"
              description="All member requests have been reviewed."
            />
          ) : (
            <Table>
              <Table.Header>
                <Table.Row>
                  <Table.Heading>Name</Table.Heading>
                  <Table.Heading>Phone</Table.Heading>
                  <Table.Heading>Package</Table.Heading>
                  <Table.Heading>Join Date</Table.Heading>
                  <Table.Heading>Added By</Table.Heading>
                  <Table.Heading>Actions</Table.Heading>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {pendingMembers.map((member) => (
                  <Table.Row key={member._id} interactive>
                    <Table.Cell>
                      <Link
                        to={`/members/${member._id}`}
                        className="text-sm font-medium text-slate-900 hover:text-brand-600 dark:text-slate-100 dark:hover:text-brand-400"
                      >
                        {member.name}
                      </Link>
                    </Table.Cell>
                    <Table.Cell>{member.phone}</Table.Cell>
                    <Table.Cell>
                      <div className="text-slate-900 dark:text-slate-100">
                        {member.packageId?.name || 'N/A'}
                      </div>
                      {member.packageId?.priceGents != null && (
                        <div className="text-xs text-slate-500 dark:text-slate-400">
                          ৳
                          {member.gender === 'Female'
                            ? member.packageId.priceLadies
                            : member.packageId.priceGents}
                        </div>
                      )}
                    </Table.Cell>
                    <Table.Cell>
                      {member.joinDate ? new Date(member.joinDate).toLocaleDateString() : 'N/A'}
                    </Table.Cell>
                    <Table.Cell>
                      {member.addedBy?.name || member.addedBy?.email || 'Unknown'}
                    </Table.Cell>
                    <Table.Cell className="whitespace-nowrap">
                      <div className="inline-flex gap-2">
                        <Button
                          variant="success"
                          size="sm"
                          onClick={() => handleApprove(member._id)}
                        >
                          Approve
                        </Button>
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => setRejectingId(member._id)}
                        >
                          Reject
                        </Button>
                      </div>
                    </Table.Cell>
                  </Table.Row>
                ))}
              </Table.Body>
            </Table>
          )}
        </Card>
      ) : (
        <Card padding="md">
          <div className="mb-6 flex flex-col gap-4 md:flex-row">
            <div className="flex-1">
              <FormField label="Search Members">
                <Input
                  type="text"
                  placeholder="Search by name, phone, or ID..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </FormField>
            </div>
            <div className="md:w-48">
              <FormField label="Filter by Status">
                <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                  <option value="">All Status</option>
                  <option value="active">Active</option>
                  <option value="expired">Expired</option>
                  <option value="expiring">Expiring Soon</option>
                </Select>
              </FormField>
            </div>
          </div>

          {members.length === 0 ? (
            <EmptyState
              icon={<Users className="w-5 h-5" />}
              title="No members found"
              description="Get started by adding your first member."
              action={
                <Button variant="primary" to="/members/add">
                  Add Member
                </Button>
              }
            />
          ) : (
            <>
              <Table>
                <Table.Header>
                  <Table.Row>
                    <Table.Heading className="whitespace-nowrap">Member ID</Table.Heading>
                    <Table.Heading>Name</Table.Heading>
                    <Table.Heading>Phone</Table.Heading>
                    <Table.Heading>Package</Table.Heading>
                    <Table.Heading className="whitespace-nowrap">Payment Status</Table.Heading>
                    <Table.Heading>Expiry</Table.Heading>
                    <Table.Heading>Status</Table.Heading>
                    <Table.Heading>Fingerprint</Table.Heading>
                    <Table.Heading>Actions</Table.Heading>
                  </Table.Row>
                </Table.Header>
                <Table.Body>
                  {members.map((member) => {
                    const status =
                      member.status === 'pending'
                        ? { label: 'Pending Approval', variant: 'warning' }
                        : getStatusBadge(member.expiryDate);
                    const payment = getPaymentBadge(member);
                    return (
                      <Table.Row key={member._id} interactive>
                        <Table.Cell>
                          <div className="flex items-center gap-3">
                            <div className="flex h-8 w-8 items-center justify-center rounded-control bg-slate-100 text-sm font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                              {member.memberId
                                ? member.memberId.slice(-1)
                                : member.name?.charAt(0).toUpperCase() || '-'}
                            </div>
                            <Link
                              to={`/members/${member._id}`}
                              className="text-sm font-medium text-slate-900 hover:text-brand-600 dark:text-slate-100 dark:hover:text-brand-400"
                            >
                              {member.memberId || 'N/A'}
                            </Link>
                          </div>
                        </Table.Cell>
                        <Table.Cell>
                          <Link
                            to={`/members/${member._id}`}
                            className="text-slate-900 hover:text-brand-600 hover:underline dark:text-slate-100 dark:hover:text-brand-400"
                          >
                            {member.name}
                          </Link>
                        </Table.Cell>
                        <Table.Cell>{member.phone}</Table.Cell>
                        <Table.Cell>
                          <div className="text-slate-900 dark:text-slate-100">
                            {member.packageId?.name}
                          </div>
                          <div className="text-xs text-slate-500 dark:text-slate-400">
                            ৳
                            {member.gender === 'Female'
                              ? member.packageId?.priceLadies
                              : member.packageId?.priceGents}
                          </div>
                        </Table.Cell>
                        <Table.Cell className="whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <span
                              className={cn(
                                'h-2 w-2 shrink-0 rounded-full',
                                PAYMENT_DOT[payment.variant],
                              )}
                              aria-hidden="true"
                            />
                            <div className="leading-tight">
                              <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                                {payment.label}
                              </div>
                              <div className="text-xs text-slate-500 dark:text-slate-400">
                                ৳{(member.paidAmount || 0).toLocaleString()}
                                {member.dueAmount > 0 && (
                                  <span className="text-red-600 dark:text-red-400">
                                    {' · '}৳{member.dueAmount.toLocaleString()} due
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </Table.Cell>
                        <Table.Cell>
                          {member.expiryDate
                            ? new Date(member.expiryDate).toLocaleDateString()
                            : 'Lifetime'}
                        </Table.Cell>
                        <Table.Cell>
                          <Badge variant={status.variant}>{status.label}</Badge>
                        </Table.Cell>
                        <Table.Cell>
                          {member.deviceUserId != null ? (
                            <Badge
                              variant="success"
                              size="sm"
                              title={`Device User ID: ${member.deviceUserId}`}
                            >
                              Registered
                            </Badge>
                          ) : (
                            <Button
                              variant="secondary"
                              size="sm"
                              to={`/members/${member._id}/edit`}
                            >
                              Not Set
                            </Button>
                          )}
                        </Table.Cell>
                        <Table.Cell className="whitespace-nowrap">
                          <div className="inline-flex gap-2">
                            <Button
                              variant="secondary"
                              size="sm"
                              to={`/members/${member._id}/edit`}
                            >
                              Edit
                            </Button>
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => setDeletingId(member._id)}
                            >
                              Delete
                            </Button>
                          </div>
                        </Table.Cell>
                      </Table.Row>
                    );
                  })}
                </Table.Body>
              </Table>
              <div className="mt-3 border-t border-slate-200 px-4 dark:border-slate-800">
                <Pagination page={page} totalPages={totalPages} onChange={setPage} />
              </div>
            </>
          )}
        </Card>
      )}

      <ConfirmModal
        open={!!deletingId}
        title="Delete Member"
        message={`Are you sure you want to delete ${
          members.find((m) => m._id === deletingId)?.name || 'this member'
        }? This removes all their records.`}
        onConfirm={() => confirmDelete(deletingId)}
        onCancel={() => setDeletingId(null)}
      />

      <ConfirmModal
        open={!!rejectingId}
        title="Reject Member"
        message={`Are you sure you want to reject ${
          pendingMembers.find((m) => m._id === rejectingId)?.name || 'this member'
        }? This will permanently delete their request.`}
        confirmLabel="Reject"
        onConfirm={() => handleReject(rejectingId)}
        onCancel={() => setRejectingId(null)}
      />
    </div>
  );
};

export default MembersList;
