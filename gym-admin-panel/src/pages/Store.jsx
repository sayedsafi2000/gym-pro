import React, { useEffect, useState } from 'react';
import api from '../services/api';
import useToast from '../hooks/useToast';

const Store = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    description: '',
    price: '',
    stock: '',
  });
  const [editingId, setEditingId] = useState(null);
  const [deletingProductId, setDeletingProductId] = useState(null);
  const { showSuccess, showError } = useToast();

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const res = await api.get('/products');
      setProducts(res.data.data);
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        name: formData.name,
        category: formData.category,
        description: formData.description,
        price: parseFloat(formData.price),
        stock: parseInt(formData.stock, 10),
      };

      if (editingId) {
        await api.put(`/products/${editingId}`, payload);
      } else {
        await api.post('/products', payload);
      }

      setFormData({ name: '', category: '', description: '', price: '', stock: '' });
      setEditingId(null);
      setShowForm(false);
      fetchProducts();
      showSuccess(editingId ? 'Product updated' : 'Product added');
    } catch (error) {
      console.error('Error saving product:', error);
      showError('Failed to save product.');
    }
  };

  const handleEdit = (product) => {
    setFormData({
      name: product.name,
      category: product.category,
      description: product.description || '',
      price: product.price,
      stock: product.stock,
    });
    setEditingId(product._id);
    setShowForm(true);
  };

  const confirmDeleteProduct = async (id) => {
    try {
      await api.delete(`/products/${id}`);
      showSuccess('Product deleted');
      fetchProducts();
    } catch (error) {
      console.error('Error deleting product:', error);
      showError('Failed to delete product.');
    } finally {
      setDeletingProductId(null);
    }
  };

  const handleSell = async (product) => {
    if (product.stock <= 0) return;
    try {
      await api.post(`/products/${product._id}/sell`, { quantity: 1 });
      fetchProducts();
      showSuccess('Sale recorded');
    } catch (error) {
      console.error('Error selling product:', error);
      showError('Failed to record sale.');
    }
  };

  if (loading) return <div className="flex items-center justify-center min-h-48">Loading...</div>;

  return (
    <div className="space-y-6">
      <div className="bg-white border border-slate-200 p-8 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold text-slate-900">Store</h1>
          <p className="text-sm text-slate-500 mt-2">Manage gym products and sell directly from the admin panel.</p>
        </div>
        <button
          onClick={() => {
            setShowForm(!showForm);
            setEditingId(null);
            setFormData({ name: '', category: '', description: '', price: '', stock: '' });
          }}
          className="rounded-[5px] border border-slate-300 bg-white px-5 py-2 text-sm font-medium text-slate-900 transition hover:bg-slate-50"
        >
          {showForm ? 'Close Form' : 'Add Product'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white border border-slate-200 p-6 shadow-sm space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input
              type="text"
              placeholder="Product name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="rounded-[5px] border border-slate-300 bg-slate-50 px-4 py-3 text-slate-900 focus:border-slate-400 focus:ring-2 focus:ring-slate-200 transition duration-200"
              required
            />
            <input
              type="text"
              placeholder="Category (e.g. Supplements, Apparel, Accessories)"
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              className="rounded-[5px] border border-slate-300 bg-slate-50 px-4 py-3 text-slate-900 focus:border-slate-400 focus:ring-2 focus:ring-slate-200 transition duration-200"
              required
            />
          </div>
          <textarea
            placeholder="Description"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            className="w-full rounded-[5px] border border-slate-300 bg-slate-50 px-4 py-3 text-slate-900 focus:border-slate-400 focus:ring-2 focus:ring-slate-200 transition duration-200"
            rows={3}
          />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input
              type="number"
              placeholder="Price"
              value={formData.price}
              onChange={(e) => setFormData({ ...formData, price: e.target.value })}
              className="rounded-[5px] border border-slate-300 bg-slate-50 px-4 py-3 text-slate-900 focus:border-slate-400 focus:ring-2 focus:ring-slate-200 transition duration-200"
              required
            />
            <input
              type="number"
              placeholder="Stock"
              value={formData.stock}
              onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
              className="rounded-[5px] border border-slate-300 bg-slate-50 px-4 py-3 text-slate-900 focus:border-slate-400 focus:ring-2 focus:ring-slate-200 transition duration-200"
              required
            />
          </div>
          <button type="submit" className="rounded-[5px] bg-slate-900 px-6 py-3 text-sm font-medium text-white hover:bg-slate-800 transition duration-200">
            {editingId ? 'Update Product' : 'Save Product'}
          </button>
        </form>
      )}

      <div className="bg-white border border-slate-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Product</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Category</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Price</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Stock</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Sold</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
              {products.map((product) => (
                <tr key={product._id} className="hover:bg-slate-50 transition duration-200">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">{product.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700">{product.category}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700">৳{product.price}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700">{product.stock}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700">{product.soldCount}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-3">
                    <button
                      onClick={() => handleSell(product)}
                      disabled={product.stock <= 0}
                      className="rounded-[5px] bg-emerald-600 px-3 py-1 text-white text-xs hover:bg-emerald-700 disabled:bg-slate-300"
                    >
                      Sell
                    </button>
                    <button onClick={() => handleEdit(product)} className="rounded-[5px] bg-slate-100 px-3 py-1 text-slate-900 text-xs hover:bg-slate-200">
                      Edit
                    </button>
                    {deletingProductId === product._id ? (
                      <div className="inline-flex items-center gap-1">
                        <span className="text-xs text-red-600">Delete?</span>
                        <button onClick={() => confirmDeleteProduct(product._id)} className="rounded-[5px] bg-red-600 px-2 py-1 text-xs text-white hover:bg-red-700">Yes</button>
                        <button onClick={() => setDeletingProductId(null)} className="rounded-[5px] bg-slate-100 px-2 py-1 text-xs text-slate-600 hover:bg-slate-200">No</button>
                      </div>
                    ) : (
                      <button onClick={() => setDeletingProductId(product._id)} className="rounded-[5px] bg-red-50 px-3 py-1 text-red-700 text-xs hover:bg-red-100">
                        Delete
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {products.length === 0 && !loading && (
        <div className="bg-slate-50 border border-slate-200 rounded-[5px] p-8 text-center">
          <p className="text-sm font-medium text-slate-700">No products yet</p>
          <p className="text-xs text-slate-500 mt-1">Add your first product to start tracking inventory.</p>
        </div>
      )}
    </div>
  );
};

export default Store;
