import React, { useEffect, useState } from 'react';
import {
  LayoutGrid,
  List,
  ChevronDown,
  Package as PackageIcon,
} from 'lucide-react';
import api from '../services/api';
import { getErrorMessage } from '../services/errorHandler';
import useToast from '../hooks/useToast';
import ConfirmModal from '../components/ConfirmModal';
import ReceiptModal from '../components/ReceiptModal';
import Pagination from '../components/Pagination';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import Textarea from '../components/ui/Textarea';
import FormField from '../components/ui/FormField';
import Spinner from '../components/ui/Spinner';
import StatCard from '../components/ui/StatCard';
import EmptyState from '../components/ui/EmptyState';
import Table from '../components/ui/Table';
import Modal from '../components/ui/Modal';
import { cn } from '../components/ui/cn';

const CATEGORIES = ['Supplements', 'Apparel', 'Accessories', 'Equipment', 'Drinks'];

const CATEGORY_VARIANT = {
  Supplements: 'success',
  Apparel: 'brand',
  Accessories: 'info',
  Equipment: 'warning',
  Drinks: 'info',
};
const categoryVariant = (cat) => CATEGORY_VARIANT[cat] || 'neutral';

const stockInfo = (stock) => {
  if (stock === 0) return { label: 'Out of Stock', variant: 'danger' };
  if (stock < 10) return { label: `Low Stock (${stock})`, variant: 'warning' };
  return { label: `In Stock (${stock})`, variant: 'success' };
};

const Store = () => {
  const { showSuccess, showError } = useToast();
  const [products, setProducts] = useState([]);
  const [stats, setStats] = useState(null);
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [viewMode, setViewMode] = useState('grid');

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

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const LIMIT = 12;

  const [formData, setFormData] = useState({
    name: '',
    category: '',
    description: '',
    price: '',
    stock: '',
  });

  useEffect(() => {
    setPage(1);
  }, [search, categoryFilter]);

  useEffect(() => {
    fetchProducts();
  }, [search, categoryFilter, page]);

  useEffect(() => {
    fetchStatsAndSales();
  }, []);

  const fetchProducts = async () => {
    try {
      const params = { page, limit: LIMIT };
      if (search) params.search = search;
      if (categoryFilter) params.category = categoryFilter;
      const prodRes = await api.get('/products', { params });
      setProducts(prodRes.data.data);
      setTotalPages(prodRes.data.pagination?.totalPages || 1);
    } catch (err) {
      console.error('Error fetching products:', err);
      showError('Failed to load products.');
    } finally {
      setLoading(false);
    }
  };

  const fetchStatsAndSales = async () => {
    try {
      const [statsRes, salesRes] = await Promise.all([
        api.get('/products/stats'),
        api.get('/products/sales?limit=20'),
      ]);
      setStats(statsRes.data.data);
      setSales(salesRes.data.data);
    } catch (err) {
      console.error('Error fetching stats/sales:', err);
    }
  };

  const fetchAll = () => {
    fetchProducts();
    fetchStatsAndSales();
  };

  const filtered = products;
  const categories = stats?.categories || [];

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
    } catch (err) {
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
    } catch (err) {
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
    } catch (err) {
      showError(getErrorMessage(err, 'Failed to record sale.'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleViewReceipt = async (saleId) => {
    try {
      const res = await api.get(`/products/sales/${saleId}/receipt`);
      setReceiptData(res.data.data);
      setShowReceipt(true);
    } catch (err) {
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
    } catch (err) {
      showError('Failed to restock.');
    } finally {
      setSubmitting(false);
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
    <div className="space-y-6">
      {/* Header */}
      <Card padding="lg">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400">
              Inventory
            </p>
            <h1 className="mt-3 text-3xl font-semibold text-slate-900 dark:text-slate-100">
              Store
            </h1>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              Manage products, record sales, and track inventory.
            </p>
          </div>
          <Button variant="primary" onClick={openAdd}>
            + Add Product
          </Button>
        </div>
      </Card>

      {/* Stats */}
      {stats && (
        <section className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          <StatCard label="Products" value={stats.totalProducts} accent="neutral" />
          <StatCard
            label="Stock Value"
            value={`৳${stats.totalStockValue}`}
            accent="brand"
          />
          <StatCard label="Low Stock" value={stats.lowStockCount} accent="warning" />
          <StatCard label="Out of Stock" value={stats.outOfStockCount} accent="danger" />
          <StatCard
            label="Today's Sales"
            value={`৳${stats.todaySalesRevenue}`}
            hint={`${stats.todaySalesCount} items`}
            accent="success"
          />
        </section>
      )}

      {/* Filter + View */}
      <Card padding="sm">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
          <Input
            type="text"
            placeholder="Search products..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1"
          />
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => setCategoryFilter('')}
              className={cn(
                'rounded-control px-3 py-1.5 text-xs font-medium transition',
                !categoryFilter
                  ? 'bg-brand-600 text-white dark:bg-brand-500'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700',
              )}
            >
              All
            </button>
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setCategoryFilter(categoryFilter === cat ? '' : cat)}
                className={cn(
                  'rounded-control px-3 py-1.5 text-xs font-medium transition',
                  categoryFilter === cat
                    ? 'bg-brand-600 text-white dark:bg-brand-500'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700',
                )}
              >
                {cat}
              </button>
            ))}
          </div>
          <div className="flex overflow-hidden rounded-control border border-slate-200 dark:border-slate-700">
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={cn(
                'px-3 py-1.5 transition',
                viewMode === 'grid'
                  ? 'bg-brand-600 text-white dark:bg-brand-500'
                  : 'bg-white text-slate-600 hover:bg-slate-50 dark:bg-slate-900 dark:text-slate-400 dark:hover:bg-slate-800',
              )}
              aria-label="Grid view"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={cn(
                'px-3 py-1.5 transition',
                viewMode === 'table'
                  ? 'bg-brand-600 text-white dark:bg-brand-500'
                  : 'bg-white text-slate-600 hover:bg-slate-50 dark:bg-slate-900 dark:text-slate-400 dark:hover:bg-slate-800',
              )}
              aria-label="Table view"
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </Card>

      {/* Products */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={<PackageIcon className="w-5 h-5" />}
          title={products.length === 0 ? 'No products yet' : 'No products match your filter'}
          description={
            products.length === 0
              ? 'Add your first product to get started.'
              : 'Try a different search or category.'
          }
          action={
            products.length === 0 && (
              <Button variant="primary" onClick={openAdd}>
                + Add Product
              </Button>
            )
          }
        />
      ) : viewMode === 'grid' ? (
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((product) => {
            const stock = stockInfo(product.stock);
            return (
              <Card key={product._id} padding="md" className="flex flex-col">
                <div className="mb-3 flex items-start justify-between">
                  <Badge variant={categoryVariant(product.category)}>{product.category}</Badge>
                  <Badge variant={stock.variant}>{stock.label}</Badge>
                </div>
                <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                  {product.name}
                </h3>
                {product.description && (
                  <p className="mt-1 text-xs text-slate-500 line-clamp-2 dark:text-slate-400">
                    {product.description}
                  </p>
                )}
                <div className="mt-auto flex items-end justify-between pt-4">
                  <p className="text-xl font-semibold text-slate-900 dark:text-slate-100">
                    ৳{product.price}
                  </p>
                  <p className="text-xs text-slate-400">{product.soldCount} sold</p>
                </div>
                <div className="mt-4 flex gap-2 border-t border-slate-100 pt-4 dark:border-slate-800">
                  <Button
                    variant="success"
                    size="sm"
                    fullWidth
                    disabled={product.stock === 0}
                    onClick={() => {
                      setSellProduct(product);
                      setSellQty(1);
                      setSellNote('');
                      setShowSellModal(true);
                    }}
                  >
                    Sell
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      setRestockProduct(product);
                      setRestockQty('');
                      setShowRestockModal(true);
                    }}
                  >
                    Restock
                  </Button>
                  <Button variant="secondary" size="sm" onClick={() => openEdit(product)}>
                    Edit
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => setDeletingId(product._id)}
                  >
                    Del
                  </Button>
                </div>
              </Card>
            );
          })}
        </section>
      ) : (
        <Card padding="none" className="overflow-hidden">
          <Table>
            <Table.Header>
              <Table.Row>
                <Table.Heading>Product</Table.Heading>
                <Table.Heading>Category</Table.Heading>
                <Table.Heading>Price</Table.Heading>
                <Table.Heading>Stock</Table.Heading>
                <Table.Heading>Sold</Table.Heading>
                <Table.Heading>Actions</Table.Heading>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {filtered.map((product) => {
                const stock = stockInfo(product.stock);
                return (
                  <Table.Row key={product._id} interactive>
                    <Table.Cell className="font-medium text-slate-900 dark:text-slate-100">
                      {product.name}
                    </Table.Cell>
                    <Table.Cell>
                      <Badge variant={categoryVariant(product.category)}>
                        {product.category}
                      </Badge>
                    </Table.Cell>
                    <Table.Cell>৳{product.price}</Table.Cell>
                    <Table.Cell>
                      <Badge variant={stock.variant}>{stock.label}</Badge>
                    </Table.Cell>
                    <Table.Cell>{product.soldCount}</Table.Cell>
                    <Table.Cell className="whitespace-nowrap">
                      <div className="inline-flex gap-1.5">
                        <Button
                          variant="success"
                          size="sm"
                          disabled={product.stock === 0}
                          onClick={() => {
                            setSellProduct(product);
                            setSellQty(1);
                            setSellNote('');
                            setShowSellModal(true);
                          }}
                        >
                          Sell
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => {
                            setRestockProduct(product);
                            setRestockQty('');
                            setShowRestockModal(true);
                          }}
                        >
                          Restock
                        </Button>
                        <Button variant="secondary" size="sm" onClick={() => openEdit(product)}>
                          Edit
                        </Button>
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => setDeletingId(product._id)}
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
        </Card>
      )}

      {filtered.length > 0 && (
        <Card padding="none" className="px-4">
          <Pagination page={page} totalPages={totalPages} onChange={setPage} />
        </Card>
      )}

      {/* Recent Sales */}
      <Card padding="none">
        <button
          type="button"
          onClick={() => setShowSales(!showSales)}
          className="flex w-full items-center justify-between px-6 py-4 text-left transition hover:bg-slate-50 dark:hover:bg-slate-800"
        >
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-900 dark:text-slate-100">
            Recent Sales ({sales.length})
          </h2>
          <ChevronDown
            className={cn(
              'w-4 h-4 text-slate-400 transition-transform',
              showSales && 'rotate-180',
            )}
          />
        </button>
        {showSales && (
          <div className="border-t border-slate-200 dark:border-slate-800">
            {sales.length === 0 ? (
              <div className="px-6 py-8 text-center text-sm text-slate-500 dark:text-slate-400">
                No sales recorded yet.
              </div>
            ) : (
              <Table>
                <Table.Header>
                  <Table.Row>
                    <Table.Heading>Product</Table.Heading>
                    <Table.Heading>Qty</Table.Heading>
                    <Table.Heading>Unit Price</Table.Heading>
                    <Table.Heading>Total</Table.Heading>
                    <Table.Heading>Note</Table.Heading>
                    <Table.Heading>Date</Table.Heading>
                    <Table.Heading />
                  </Table.Row>
                </Table.Header>
                <Table.Body>
                  {sales.map((sale) => (
                    <Table.Row key={sale._id} interactive>
                      <Table.Cell className="font-medium text-slate-900 dark:text-slate-100">
                        {sale.productName}
                      </Table.Cell>
                      <Table.Cell>{sale.quantity}</Table.Cell>
                      <Table.Cell>৳{sale.unitPrice}</Table.Cell>
                      <Table.Cell className="font-semibold text-slate-900 dark:text-slate-100">
                        ৳{sale.totalAmount}
                      </Table.Cell>
                      <Table.Cell className="text-xs text-slate-500 dark:text-slate-400">
                        {sale.note || '-'}
                      </Table.Cell>
                      <Table.Cell>{new Date(sale.soldAt).toLocaleString()}</Table.Cell>
                      <Table.Cell>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => handleViewReceipt(sale._id)}
                        >
                          Receipt
                        </Button>
                      </Table.Cell>
                    </Table.Row>
                  ))}
                </Table.Body>
              </Table>
            )}
          </div>
        )}
      </Card>

      {/* Add/Edit Modal */}
      <Modal open={showAddEdit} onClose={() => setShowAddEdit(false)} size="md">
        <form onSubmit={handleAddEdit} className="p-6 space-y-4">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            {editingProduct ? 'Edit Product' : 'Add Product'}
          </h3>
          <FormField label="Name" required>
            <Input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
          </FormField>
          <FormField label="Category" required>
            <Select
              required
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
            >
              <option value="">Select category</option>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
              <option value="Other">Other</option>
            </Select>
          </FormField>
          <FormField label="Description">
            <Textarea
              rows={2}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </FormField>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Price (৳)" required>
              <Input
                type="number"
                required
                min="0"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
              />
            </FormField>
            <FormField label="Stock" required>
              <Input
                type="number"
                required
                min="0"
                value={formData.stock}
                onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
              />
            </FormField>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setShowAddEdit(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" loading={submitting}>
              {editingProduct ? 'Update' : 'Add Product'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Sell Modal */}
      <Modal open={showSellModal && !!sellProduct} onClose={() => setShowSellModal(false)} size="sm">
        {sellProduct && (
          <div className="p-6 space-y-4">
            <div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                Sell {sellProduct.name}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Current stock: {sellProduct.stock}
              </p>
            </div>
            <FormField label="Quantity">
              <Input
                type="number"
                min={1}
                max={sellProduct.stock}
                value={sellQty}
                onChange={(e) =>
                  setSellQty(
                    Math.min(parseInt(e.target.value, 10) || 1, sellProduct.stock),
                  )
                }
              />
            </FormField>
            <div className="flex items-center justify-between rounded-control border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950">
              <span className="text-sm text-slate-600 dark:text-slate-400">Total</span>
              <span className="text-xl font-semibold text-slate-900 dark:text-slate-100">
                ৳{sellQty * sellProduct.price}
              </span>
            </div>
            <FormField label="Note (optional)">
              <Input
                type="text"
                value={sellNote}
                onChange={(e) => setSellNote(e.target.value)}
                placeholder="e.g., Member name or receipt #"
              />
            </FormField>
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="secondary" onClick={() => setShowSellModal(false)} disabled={submitting}>
                Cancel
              </Button>
              <Button variant="success" onClick={handleSell} loading={submitting} disabled={sellQty < 1}>
                Confirm Sale
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Restock Modal */}
      <Modal open={showRestockModal && !!restockProduct} onClose={() => setShowRestockModal(false)} size="sm">
        {restockProduct && (
          <div className="p-6 space-y-4">
            <div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                Restock {restockProduct.name}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Current stock: {restockProduct.stock}
              </p>
            </div>
            <FormField label="Quantity to Add">
              <Input
                type="number"
                min={1}
                value={restockQty}
                onChange={(e) => setRestockQty(e.target.value)}
                placeholder="Enter quantity"
              />
            </FormField>
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="secondary" onClick={() => setShowRestockModal(false)} disabled={submitting}>
                Cancel
              </Button>
              <Button variant="primary" onClick={handleRestock} loading={submitting} disabled={!restockQty}>
                Confirm Restock
              </Button>
            </div>
          </div>
        )}
      </Modal>

      <ConfirmModal
        open={!!deletingId}
        title="Delete Product"
        message="Are you sure you want to delete this product? Sale history for this product will be preserved."
        onConfirm={() => confirmDelete(deletingId)}
        onCancel={() => setDeletingId(null)}
      />

      <ReceiptModal
        open={showReceipt}
        onClose={() => {
          setShowReceipt(false);
          setReceiptData(null);
        }}
        type="sale"
        data={receiptData}
      />
    </div>
  );
};

export default Store;
