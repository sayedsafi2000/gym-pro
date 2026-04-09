import React, { useEffect, useState } from 'react';
import api from '../services/api';
import useToast from '../hooks/useToast';
import ConfirmModal from '../components/ConfirmModal';
import ReceiptModal from '../components/ReceiptModal';

const CATEGORIES = ['Supplements', 'Apparel', 'Accessories', 'Equipment', 'Drinks'];

const CATEGORY_COLORS = {
  Supplements: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  Apparel: 'border-blue-200 bg-blue-50 text-blue-700',
  Accessories: 'border-purple-200 bg-purple-50 text-purple-700',
  Equipment: 'border-orange-200 bg-orange-50 text-orange-700',
  Drinks: 'border-cyan-200 bg-cyan-50 text-cyan-700',
};

const getCategoryColor = (cat) =>
  CATEGORY_COLORS[cat] || 'border-slate-200 bg-slate-50 text-slate-600';

const getStockBadge = (stock) => {
  if (stock === 0) return { label: 'Out of Stock', cls: 'border-red-200 bg-red-50 text-red-700' };
  if (stock < 10) return { label: `Low Stock (${stock})`, cls: 'border-yellow-200 bg-yellow-50 text-yellow-700' };
  return { label: `In Stock (${stock})`, cls: 'border-green-200 bg-green-50 text-green-700' };
};

const Store = () => {
  const { showSuccess, showError } = useToast();

  // Data
  const [products, setProducts] = useState([]);
  const [stats, setStats] = useState(null);
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [viewMode, setViewMode] = useState('grid');

  // Modals
  const [showAddEdit, setShowAddEdit] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [showSellModal, setShowSellModal] = useState(false);
  const [sellProduct, setSellProduct] = useState(null);
  const [sellQty, setSellQty] = useState(1);
  const [sellNote, setSellNote] = useState('');
  const [showRestockModal, setShowRestockModal] = useState(false);
  const [restockProduct, setRestockProduct] = useState(null);
  const [restockQty, setRestockQty] = useState('');
  const [deletingId, setDeletingId] = useState(null);
  const [showSales, setShowSales] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [receiptData, setReceiptData] = useState(null);
  const [showReceipt, setShowReceipt] = useState(false);

  // Form
  const [formData, setFormData] = useState({
    name: '', category: '', description: '', price: '', stock: '',
  });

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    try {
      const [prodRes, statsRes, salesRes] = await Promise.all([
        api.get('/products'),
        api.get('/products/stats'),
        api.get('/products/sales?limit=20'),
      ]);
      setProducts(prodRes.data.data);
      setStats(statsRes.data.data);
      setSales(salesRes.data.data);
    } catch (error) {
      console.error('Error fetching store data:', error);
      showError('Failed to load store data.');
    } finally {
      setLoading(false);
    }
  };

  // Filter products client-side for instant feedback
  const filtered = products.filter((p) => {
    const matchSearch = !search || p.name.toLowerCase().includes(search.toLowerCase());
    const matchCat = !categoryFilter || p.category === categoryFilter;
    return matchSearch && matchCat;
  });

  // Unique categories from data
  const categories = [...new Set(products.map((p) => p.category))];

  // --- Handlers ---

  const handleAddEdit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (editingProduct) {
        await api.put(`/products/${editingProduct._id}`, formData);
        showSuccess('Product updated');
      } else {
        await api.post('/products', formData);
        showSuccess('Product added');
      }
      setShowAddEdit(false);
      setEditingProduct(null);
      setFormData({ name: '', category: '', description: '', price: '', stock: '' });
      fetchAll();
    } catch (error) {
      showError('Failed to save product.');
    } finally {
      setSubmitting(false);
    }
  };

  const openEdit = (product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      category: product.category,
      description: product.description || '',
      price: String(product.price),
      stock: String(product.stock),
    });
    setShowAddEdit(true);
  };

  const openAdd = () => {
    setEditingProduct(null);
    setFormData({ name: '', category: '', description: '', price: '', stock: '' });
    setShowAddEdit(true);
  };

  const confirmDelete = async (id) => {
    try {
      await api.delete(`/products/${id}`);
      showSuccess('Product deleted');
      fetchAll();
    } catch (error) {
      showError('Failed to delete product.');
    } finally {
      setDeletingId(null);
    }
  };

  const handleSell = async () => {
    if (!sellProduct) return;
    setSubmitting(true);
    try {
      await api.post(`/products/${sellProduct._id}/sell`, {
        quantity: sellQty,
        note: sellNote,
      });
      showSuccess(`Sold ${sellQty}x ${sellProduct.name}`);
      setShowSellModal(false);
      setSellProduct(null);
      setSellQty(1);
      setSellNote('');
      fetchAll();
    } catch (error) {
      showError(error.response?.data?.message || 'Failed to record sale.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleViewReceipt = async (saleId) => {
    try {
      const res = await api.get(`/products/sales/${saleId}/receipt`);
      setReceiptData(res.data.data);
      setShowReceipt(true);
    } catch (error) {
      showError('Failed to load receipt.');
    }
  };

  const handleRestock = async () => {
    if (!restockProduct || !restockQty) return;
    setSubmitting(true);
    try {
      await api.post(`/products/${restockProduct._id}/restock`, {
        quantity: parseInt(restockQty, 10),
      });
      showSuccess(`Restocked ${restockQty} units of ${restockProduct.name}`);
      setShowRestockModal(false);
      setRestockProduct(null);
      setRestockQty('');
      fetchAll();
    } catch (error) {
      showError('Failed to restock.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-slate-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <section className="bg-white border border-slate-200 p-8 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-slate-500">Inventory</p>
            <h1 className="text-3xl font-semibold text-slate-900 mt-3">Store</h1>
            <p className="mt-2 text-sm text-slate-500">Manage products, record sales, and track inventory.</p>
          </div>
          <button
            onClick={openAdd}
            className="rounded-[5px] bg-slate-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-slate-800 transition"
          >
            + Add Product
          </button>
        </div>
      </section>

      {/* Stats Bar */}
      {stats && (
        <section className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          <div className="bg-white border border-slate-200 p-5 shadow-sm">
            <p className="text-xs text-slate-500 uppercase tracking-wide">Products</p>
            <p className="mt-2 text-3xl font-semibold text-slate-900">{stats.totalProducts}</p>
          </div>
          <div className="bg-white border border-slate-200 p-5 shadow-sm">
            <p className="text-xs text-slate-500 uppercase tracking-wide">Stock Value</p>
            <p className="mt-2 text-3xl font-semibold text-slate-900">৳{stats.totalStockValue}</p>
          </div>
          <div className="bg-white border border-slate-200 p-5 shadow-sm">
            <p className="text-xs text-slate-500 uppercase tracking-wide">Low Stock</p>
            <p className="mt-2 text-3xl font-semibold text-yellow-600">{stats.lowStockCount}</p>
          </div>
          <div className="bg-white border border-slate-200 p-5 shadow-sm">
            <p className="text-xs text-slate-500 uppercase tracking-wide">Out of Stock</p>
            <p className="mt-2 text-3xl font-semibold text-red-600">{stats.outOfStockCount}</p>
          </div>
          <div className="bg-white border border-slate-200 p-5 shadow-sm">
            <p className="text-xs text-slate-500 uppercase tracking-wide">Today's Sales</p>
            <p className="mt-2 text-3xl font-semibold text-green-600">৳{stats.todaySalesRevenue}</p>
            <p className="text-xs text-slate-400 mt-1">{stats.todaySalesCount} items</p>
          </div>
        </section>
      )}

      {/* Search + Category Filter + View Toggle */}
      <section className="bg-white border border-slate-200 p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
          <input
            type="text"
            placeholder="Search products..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="rounded-[5px] border border-slate-200 px-3 py-2 text-sm flex-1 min-w-0 focus:ring-2 focus:ring-slate-300 focus:border-transparent"
          />
          <div className="flex flex-wrap gap-1.5">
            <button
              onClick={() => setCategoryFilter('')}
              className={`rounded-[5px] px-3 py-1.5 text-xs font-medium transition ${
                !categoryFilter ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              All
            </button>
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setCategoryFilter(categoryFilter === cat ? '' : cat)}
                className={`rounded-[5px] px-3 py-1.5 text-xs font-medium transition ${
                  categoryFilter === cat ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
          <div className="flex border border-slate-200 rounded-[5px] overflow-hidden">
            <button
              onClick={() => setViewMode('grid')}
              className={`px-3 py-1.5 text-xs font-medium transition ${
                viewMode === 'grid' ? 'bg-slate-900 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'
              }`}
              aria-label="Grid view"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
              </svg>
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`px-3 py-1.5 text-xs font-medium transition ${
                viewMode === 'table' ? 'bg-slate-900 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'
              }`}
              aria-label="Table view"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 5.25h16.5m-16.5 4.5h16.5m-16.5 4.5h16.5m-16.5 4.5h16.5" />
              </svg>
            </button>
          </div>
        </div>
      </section>

      {/* Products */}
      {filtered.length === 0 ? (
        <div className="bg-slate-50 border border-slate-200 rounded-[5px] p-8 text-center">
          <p className="text-sm font-medium text-slate-700">
            {products.length === 0 ? 'No products yet' : 'No products match your filter'}
          </p>
          <p className="text-xs text-slate-500 mt-1">
            {products.length === 0 ? 'Add your first product to get started.' : 'Try a different search or category.'}
          </p>
        </div>
      ) : viewMode === 'grid' ? (
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((product) => {
            const stockBadge = getStockBadge(product.stock);
            return (
              <div key={product._id} className="bg-white border border-slate-200 p-5 shadow-sm flex flex-col">
                <div className="flex items-start justify-between mb-3">
                  <span className={`inline-flex px-2 py-0.5 text-xs font-semibold rounded-[5px] border ${getCategoryColor(product.category)}`}>
                    {product.category}
                  </span>
                  <span className={`inline-flex px-2 py-0.5 text-xs font-semibold rounded-[5px] border ${stockBadge.cls}`}>
                    {stockBadge.label}
                  </span>
                </div>
                <h3 className="text-base font-semibold text-slate-900">{product.name}</h3>
                {product.description && (
                  <p className="text-xs text-slate-500 mt-1 line-clamp-2">{product.description}</p>
                )}
                <div className="flex items-end justify-between mt-auto pt-4">
                  <p className="text-xl font-semibold text-slate-900">৳{product.price}</p>
                  <p className="text-xs text-slate-400">{product.soldCount} sold</p>
                </div>
                <div className="flex gap-2 mt-4 pt-4 border-t border-slate-100">
                  <button
                    onClick={() => { setSellProduct(product); setSellQty(1); setSellNote(''); setShowSellModal(true); }}
                    disabled={product.stock === 0}
                    className="flex-1 rounded-[5px] bg-emerald-600 px-3 py-2 text-xs font-medium text-white hover:bg-emerald-700 transition disabled:bg-slate-200 disabled:text-slate-400"
                  >
                    Sell
                  </button>
                  <button
                    onClick={() => { setRestockProduct(product); setRestockQty(''); setShowRestockModal(true); }}
                    className="rounded-[5px] border border-blue-200 px-3 py-2 text-xs font-medium text-blue-700 hover:bg-blue-50 transition"
                  >
                    Restock
                  </button>
                  <button
                    onClick={() => openEdit(product)}
                    className="rounded-[5px] border border-slate-200 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 transition"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => setDeletingId(product._id)}
                    className="rounded-[5px] border border-red-200 px-3 py-2 text-xs font-medium text-red-700 hover:bg-red-50 transition"
                  >
                    Del
                  </button>
                </div>
              </div>
            );
          })}
        </section>
      ) : (
        <section className="bg-white border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">Product</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">Category</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">Price</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">Stock</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">Sold</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((product) => {
                  const stockBadge = getStockBadge(product.stock);
                  return (
                    <tr key={product._id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="px-6 py-3 font-medium text-slate-900">{product.name}</td>
                      <td className="px-6 py-3">
                        <span className={`inline-flex px-2 py-0.5 text-xs font-semibold rounded-[5px] border ${getCategoryColor(product.category)}`}>
                          {product.category}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-slate-600">৳{product.price}</td>
                      <td className="px-6 py-3">
                        <span className={`inline-flex px-2 py-0.5 text-xs font-semibold rounded-[5px] border ${stockBadge.cls}`}>
                          {stockBadge.label}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-slate-600">{product.soldCount}</td>
                      <td className="px-6 py-3">
                        <div className="flex gap-1.5">
                          <button
                            onClick={() => { setSellProduct(product); setSellQty(1); setSellNote(''); setShowSellModal(true); }}
                            disabled={product.stock === 0}
                            className="rounded-[5px] bg-emerald-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-emerald-700 disabled:bg-slate-200 disabled:text-slate-400"
                          >
                            Sell
                          </button>
                          <button
                            onClick={() => { setRestockProduct(product); setRestockQty(''); setShowRestockModal(true); }}
                            className="rounded-[5px] border border-blue-200 px-2.5 py-1 text-xs text-blue-700 hover:bg-blue-50"
                          >
                            Restock
                          </button>
                          <button onClick={() => openEdit(product)} className="rounded-[5px] border border-slate-200 px-2.5 py-1 text-xs text-slate-700 hover:bg-slate-50">Edit</button>
                          <button onClick={() => setDeletingId(product._id)} className="rounded-[5px] border border-red-200 px-2.5 py-1 text-xs text-red-700 hover:bg-red-50">Del</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Recent Sales */}
      <section className="bg-white border border-slate-200 shadow-sm">
        <button
          onClick={() => setShowSales(!showSales)}
          className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-slate-50 transition"
        >
          <h2 className="text-sm font-semibold text-slate-900 uppercase tracking-wide">
            Recent Sales ({sales.length})
          </h2>
          <svg
            className={`w-4 h-4 text-slate-400 transition-transform ${showSales ? 'rotate-180' : ''}`}
            fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        {showSales && (
          <div className="border-t border-slate-200 overflow-x-auto">
            {sales.length === 0 ? (
              <div className="px-6 py-8 text-center text-sm text-slate-500">No sales recorded yet.</div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50">
                    <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">Product</th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">Qty</th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">Unit Price</th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">Total</th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">Note</th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">Date</th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide"></th>
                  </tr>
                </thead>
                <tbody>
                  {sales.map((sale) => (
                    <tr key={sale._id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="px-6 py-3 font-medium text-slate-900">{sale.productName}</td>
                      <td className="px-6 py-3 text-slate-600">{sale.quantity}</td>
                      <td className="px-6 py-3 text-slate-600">৳{sale.unitPrice}</td>
                      <td className="px-6 py-3 font-semibold text-slate-900">৳{sale.totalAmount}</td>
                      <td className="px-6 py-3 text-slate-500 text-xs">{sale.note || '-'}</td>
                      <td className="px-6 py-3 text-slate-600">{new Date(sale.soldAt).toLocaleString()}</td>
                      <td className="px-6 py-3">
                        <button
                          onClick={() => handleViewReceipt(sale._id)}
                          className="rounded-[5px] border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 transition"
                        >
                          Receipt
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </section>

      {/* === MODALS === */}

      {/* Add/Edit Product Modal */}
      {showAddEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-slate-900/50" onClick={() => setShowAddEdit(false)} />
          <div className="relative bg-white rounded-[5px] border border-slate-200 shadow-lg max-w-md w-full mx-4 p-6 z-10 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">
              {editingProduct ? 'Edit Product' : 'Add Product'}
            </h3>
            <form onSubmit={handleAddEdit} className="space-y-4">
              <div>
                <label className="block text-xs text-slate-500 uppercase tracking-wide mb-1">Name</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full rounded-[5px] border border-slate-200 px-3 py-2 text-sm focus:ring-2 focus:ring-slate-300 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-500 uppercase tracking-wide mb-1">Category</label>
                <select
                  required
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full rounded-[5px] border border-slate-200 px-3 py-2 text-sm focus:ring-2 focus:ring-slate-300 focus:border-transparent"
                >
                  <option value="">Select category</option>
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                  <option value="Other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-slate-500 uppercase tracking-wide mb-1">Description</label>
                <textarea
                  rows={2}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full rounded-[5px] border border-slate-200 px-3 py-2 text-sm focus:ring-2 focus:ring-slate-300 focus:border-transparent resize-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-slate-500 uppercase tracking-wide mb-1">Price (৳)</label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    className="w-full rounded-[5px] border border-slate-200 px-3 py-2 text-sm focus:ring-2 focus:ring-slate-300 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 uppercase tracking-wide mb-1">Stock</label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={formData.stock}
                    onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                    className="w-full rounded-[5px] border border-slate-200 px-3 py-2 text-sm focus:ring-2 focus:ring-slate-300 focus:border-transparent"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddEdit(false)}
                  className="rounded-[5px] border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-[5px] bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 transition disabled:opacity-50"
                >
                  {submitting ? 'Saving...' : editingProduct ? 'Update' : 'Add Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Sell Modal */}
      {showSellModal && sellProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-slate-900/50" onClick={() => setShowSellModal(false)} />
          <div className="relative bg-white rounded-[5px] border border-slate-200 shadow-lg max-w-sm w-full mx-4 p-6 z-10">
            <h3 className="text-lg font-semibold text-slate-900 mb-1">Sell {sellProduct.name}</h3>
            <p className="text-xs text-slate-500 mb-4">Current stock: {sellProduct.stock}</p>
            <div className="space-y-4">
              <div>
                <label className="block text-xs text-slate-500 uppercase tracking-wide mb-1">Quantity</label>
                <input
                  type="number"
                  min={1}
                  max={sellProduct.stock}
                  value={sellQty}
                  onChange={(e) => setSellQty(Math.min(parseInt(e.target.value, 10) || 1, sellProduct.stock))}
                  className="w-full rounded-[5px] border border-slate-200 px-3 py-2 text-sm focus:ring-2 focus:ring-slate-300 focus:border-transparent"
                />
              </div>
              <div className="bg-slate-50 border border-slate-200 rounded-[5px] p-3 flex justify-between items-center">
                <span className="text-sm text-slate-600">Total</span>
                <span className="text-xl font-semibold text-slate-900">৳{sellQty * sellProduct.price}</span>
              </div>
              <div>
                <label className="block text-xs text-slate-500 uppercase tracking-wide mb-1">Note (optional)</label>
                <input
                  type="text"
                  value={sellNote}
                  onChange={(e) => setSellNote(e.target.value)}
                  placeholder="e.g., Member name or receipt #"
                  className="w-full rounded-[5px] border border-slate-200 px-3 py-2 text-sm focus:ring-2 focus:ring-slate-300 focus:border-transparent"
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowSellModal(false)}
                  className="rounded-[5px] border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSell}
                  disabled={submitting || sellQty < 1}
                  className="rounded-[5px] bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 transition disabled:opacity-50"
                >
                  {submitting ? 'Processing...' : 'Confirm Sale'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Restock Modal */}
      {showRestockModal && restockProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-slate-900/50" onClick={() => setShowRestockModal(false)} />
          <div className="relative bg-white rounded-[5px] border border-slate-200 shadow-lg max-w-sm w-full mx-4 p-6 z-10">
            <h3 className="text-lg font-semibold text-slate-900 mb-1">Restock {restockProduct.name}</h3>
            <p className="text-xs text-slate-500 mb-4">Current stock: {restockProduct.stock}</p>
            <div className="space-y-4">
              <div>
                <label className="block text-xs text-slate-500 uppercase tracking-wide mb-1">Quantity to Add</label>
                <input
                  type="number"
                  min={1}
                  value={restockQty}
                  onChange={(e) => setRestockQty(e.target.value)}
                  placeholder="Enter quantity"
                  className="w-full rounded-[5px] border border-slate-200 px-3 py-2 text-sm focus:ring-2 focus:ring-slate-300 focus:border-transparent"
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowRestockModal(false)}
                  className="rounded-[5px] border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleRestock}
                  disabled={submitting || !restockQty}
                  className="rounded-[5px] bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition disabled:opacity-50"
                >
                  {submitting ? 'Restocking...' : 'Confirm Restock'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm Modal */}
      <ConfirmModal
        open={!!deletingId}
        title="Delete Product"
        message="Are you sure you want to delete this product? Sale history for this product will be preserved."
        onConfirm={() => confirmDelete(deletingId)}
        onCancel={() => setDeletingId(null)}
      />

      <ReceiptModal
        open={showReceipt}
        onClose={() => { setShowReceipt(false); setReceiptData(null); }}
        type="sale"
        data={receiptData}
      />
    </div>
  );
};

export default Store;
