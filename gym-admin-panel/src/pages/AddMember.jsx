import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { useNavigate } from 'react-router-dom';
import useToast from '../hooks/useToast';

const AddMember = () => {
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    emergencyPhone: '',
    address: '',
    gender: '',
    joinDate: '',
    packageId: '',
    paymentType: 'due', // 'full', 'partial', 'due'
    initialPayment: '',
    installmentMonths: '',
  });
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { showSuccess, showError } = useToast();

  useEffect(() => {
    fetchPackages();
  }, []);

  const fetchPackages = async () => {
    try {
      const res = await api.get('/packages');
      setPackages(res.data.data);
    } catch (error) {
      console.error('Error fetching packages:', error);
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      // Validate partial payment amount
      if (formData.paymentType === 'partial') {
        const packagePrice = packages.find(p => p._id === formData.packageId)?.price || 0;
        const paymentAmount = parseFloat(formData.initialPayment) || 0;
        if (paymentAmount <= 0) {
          showError('Please enter a valid payment amount greater than 0');
          setLoading(false);
          return;
        }
        if (paymentAmount >= packagePrice) {
          showError('For full payment, please select "Full Payment" option');
          setLoading(false);
          return;
        }
      }

      const submitData = {
        ...formData,
        initialPayment: formData.paymentType === 'partial' ? parseFloat(formData.initialPayment) : undefined,
        installmentMonths: formData.paymentType === 'monthly' ? (formData.installmentMonths || Math.ceil(packages.find(p => p._id === formData.packageId)?.duration / 30)) : undefined,
      };

      await api.post('/members', submitData);
      showSuccess('Member created successfully');
      navigate('/members');
    } catch (error) {
      showError('Error creating member. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div className="bg-white border border-slate-200 p-8 shadow-sm rounded-[5px]">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-semibold mb-2 text-slate-900">Add New Member</h1>
            <p className="text-slate-500">Register a new gym member</p>
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="bg-white rounded-[5px] shadow-sm p-8">
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Personal Information */}
          <div>
            <h2 className="text-2xl font-semibold text-slate-800 mb-6">
              Personal Information
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Full Name *
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-slate-200 rounded-[5px] focus:ring-2 focus:ring-slate-300 focus:border-transparent transition-all duration-200"
                  placeholder="Enter full name"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Phone Number *
                </label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-slate-200 rounded-[5px] focus:ring-2 focus:ring-slate-300 focus:border-transparent transition-all duration-200"
                  placeholder="Enter phone number"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Emergency Phone</label>
                <input
                  type="tel"
                  name="emergencyPhone"
                  value={formData.emergencyPhone}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-slate-200 rounded-[5px] focus:ring-2 focus:ring-slate-300 focus:border-transparent transition-all duration-200"
                  placeholder="Emergency contact number (optional)"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Address
                </label>
                <textarea
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  rows="3"
                  className="w-full px-4 py-3 border border-slate-200 rounded-[5px] focus:ring-2 focus:ring-slate-300 focus:border-transparent transition-all duration-200 resize-none"
                  placeholder="Enter address (optional)"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Gender *
                </label>
                <select
                  name="gender"
                  value={formData.gender}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-slate-200 rounded-[5px] focus:ring-2 focus:ring-slate-300 focus:border-transparent transition-all duration-200"
                  required
                >
                  <option value="">Select Gender</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>
          </div>

          {/* Membership Details */}
          <div>
            <h2 className="text-2xl font-semibold text-slate-800 mb-6">
              Membership Details
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Join Date *
                </label>
                <input
                  type="date"
                  name="joinDate"
                  value={formData.joinDate}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-slate-200 rounded-[5px] focus:ring-2 focus:ring-slate-300 focus:border-transparent transition-all duration-200"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Package *
                </label>
                {packages.length === 0 && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-[5px] px-4 py-3 text-sm text-yellow-700 mb-2">
                    No packages available. <a href="/packages" className="underline font-medium">Create a package first</a> before adding members.
                  </div>
                )}
                <select
                  name="packageId"
                  value={formData.packageId}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-slate-200 rounded-[5px] focus:ring-2 focus:ring-slate-300 focus:border-transparent transition-all duration-200"
                  required
                >
                  <option value="">Select Package</option>
                  {packages.map((pkg) => (
                    <option key={pkg._id} value={pkg._id}>
                      {pkg.name} - ৳{pkg.price} ({pkg.duration} days)
                    </option>
                  ))}
                </select>
                {formData.packageId && (() => {
                  const selectedPkg = packages.find(p => p._id === formData.packageId);
                  if (!selectedPkg) return null;
                  return (
                    <div className="mt-3 bg-slate-50 border border-slate-200 rounded-[5px] p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-sm font-semibold text-slate-900">{selectedPkg.name}</h4>
                        {selectedPkg.category === 'special' && (
                          <span className="inline-flex px-2 py-0.5 text-xs font-semibold rounded-[5px] border border-orange-200 bg-orange-50 text-orange-700">Special Offer</span>
                        )}
                      </div>
                      {selectedPkg.description && (
                        <p className="text-xs text-slate-500 mb-2">{selectedPkg.description}</p>
                      )}
                      <div className="flex gap-4 text-xs text-slate-600">
                        <span>{selectedPkg.price.toLocaleString()}</span>
                        <span>{selectedPkg.duration} days</span>
                      </div>
                      {selectedPkg.benefits && selectedPkg.benefits.length > 0 && (
                        <div className="mt-2 pt-2 border-t border-slate-200 space-y-1">
                          {selectedPkg.benefits.map((b, i) => (
                            <div key={i} className="flex items-center gap-1.5 text-xs text-slate-600">
                              <svg className="w-3 h-3 text-green-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                              </svg>
                              {b}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>

          {/* Payment Options */}
          <div>
            <h2 className="text-2xl font-semibold text-slate-800 mb-6">
              Payment Options
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-3">
                  Payment Type *
                </label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <label className="relative">
                    <input
                      type="radio"
                      name="paymentType"
                      value="full"
                      checked={formData.paymentType === 'full'}
                      onChange={handleChange}
                      className="sr-only peer"
                    />
                    <div className="p-4 border-2 border-slate-200 rounded-[5px] cursor-pointer peer-checked:border-green-500 peer-checked:bg-green-50 transition-all duration-200 hover:border-green-300">
                      <div className="text-center">
                        <div className="text-lg font-semibold text-slate-800">Full Payment</div>
                        <div className="text-sm text-slate-600">Pay complete amount now</div>
                      </div>
                    </div>
                  </label>
                  <label className="relative">
                    <input
                      type="radio"
                      name="paymentType"
                      value="partial"
                      checked={formData.paymentType === 'partial'}
                      onChange={handleChange}
                      className="sr-only peer"
                    />
                    <div className="p-4 border-2 border-slate-200 rounded-[5px] cursor-pointer peer-checked:border-blue-500 peer-checked:bg-blue-50 transition-all duration-200 hover:border-blue-300">
                      <div className="text-center">
                        <div className="text-lg font-semibold text-slate-800">Partial Payment</div>
                        <div className="text-sm text-slate-600">Pay part of the amount</div>
                      </div>
                    </div>
                  </label>
                  <label className="relative">
                    <input
                      type="radio"
                      name="paymentType"
                      value="due"
                      checked={formData.paymentType === 'due'}
                      onChange={handleChange}
                      className="sr-only peer"
                    />
                    <div className="p-4 border-2 border-slate-200 rounded-[5px] cursor-pointer peer-checked:border-orange-500 peer-checked:bg-orange-50 transition-all duration-200 hover:border-orange-300">
                      <div className="text-center">
                        <div className="text-lg font-semibold text-slate-800">Due Payment</div>
                        <div className="text-sm text-slate-600">Pay later</div>
                      </div>
                    </div>
                  </label>
                  <label className="relative">
                    <input
                      type="radio"
                      name="paymentType"
                      value="monthly"
                      checked={formData.paymentType === 'monthly'}
                      onChange={handleChange}
                      className="sr-only peer"
                    />
                    <div className="p-4 border-2 border-slate-200 rounded-[5px] cursor-pointer peer-checked:border-purple-500 peer-checked:bg-purple-50 transition-all duration-200 hover:border-purple-300">
                      <div className="flex items-center gap-2">
                        <div className="text-lg font-semibold text-slate-800">Monthly Installment</div>
                      </div>
                      <div className="text-sm text-slate-600">Pay in equal monthly installments</div>
                    </div>
                  </label>
                </div>
              </div>

              {formData.paymentType === 'partial' && (
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Initial Payment Amount *
                  </label>
                  <input
                    type="number"
                    name="initialPayment"
                    value={formData.initialPayment}
                    onChange={handleChange}
                    min="0"
                    step="0.01"
                    max={packages.find(p => p._id === formData.packageId)?.price || 0}
                    className="w-full px-4 py-3 border border-slate-200 rounded-[5px] focus:ring-2 focus:ring-slate-300 focus:border-transparent transition-all duration-200"
                    placeholder="Enter payment amount"
                    required={formData.paymentType === 'partial'}
                  />
                  {packages.find(p => p._id === formData.packageId) && (
                    <p className="text-sm text-slate-600 mt-1">
                      Maximum amount: ৳{packages.find(p => p._id === formData.packageId).price}
                    </p>
                  )}
                </div>
              )}

              {formData.paymentType === 'monthly' && formData.packageId && (() => {
                const selectedPkg = packages.find(p => p._id === formData.packageId);
                if (!selectedPkg) return null;
                const months = parseInt(formData.installmentMonths, 10) || Math.ceil(selectedPkg.duration / 30) || 1;
                const monthlyAmt = Math.ceil(selectedPkg.price / months);
                return (
                  <div className="mt-4 bg-purple-50 border border-purple-200 rounded-[5px] p-4 space-y-3">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">Number of Months</label>
                      <input
                        type="number"
                        name="installmentMonths"
                        value={formData.installmentMonths || Math.ceil(selectedPkg.duration / 30)}
                        onChange={handleChange}
                        min="2"
                        max="24"
                        className="w-full px-4 py-3 border border-slate-200 rounded-[5px] focus:ring-2 focus:ring-slate-300 focus:border-transparent transition-all duration-200"
                      />
                    </div>
                    <div className="text-sm text-slate-700 space-y-1">
                      <div className="flex justify-between">
                        <span>Total Package Price</span>
                        <span className="font-semibold">৳{selectedPkg.price.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Monthly Payment</span>
                        <span className="font-semibold text-purple-700">৳{monthlyAmt.toLocaleString()}/month</span>
                      </div>
                      <div className="flex justify-between">
                        <span>First Payment (today)</span>
                        <span className="font-semibold text-green-700">৳{monthlyAmt.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
          {formData.packageId && (
            <div className="bg-slate-50 rounded-[5px] p-6 border border-slate-200">
              <h3 className="text-lg font-semibold text-slate-800 mb-4">
                Membership Preview
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div className="bg-white p-4 rounded-[5px]">
                  <span className="text-slate-500">Member ID:</span>
                  <span className="font-semibold text-slate-800 ml-2">Will be auto-generated</span>
                </div>
                <div className="bg-white p-4 rounded-[5px]">
                  <span className="text-slate-500">Expiry Date:</span>
                  <span className="font-semibold text-slate-800 ml-2">
                    {formData.joinDate && packages.find(p => p._id === formData.packageId) ?
                      new Date(new Date(formData.joinDate).getTime() + packages.find(p => p._id === formData.packageId).duration * 24 * 60 * 60 * 1000).toLocaleDateString()
                      : 'Select join date and package'
                    }
                  </span>
                </div>
                <div className="bg-white p-4 rounded-[5px]">
                  <span className="text-slate-500">Package Price:</span>
                  <span className="font-semibold text-green-600 ml-2">
                    ৳{packages.find(p => p._id === formData.packageId)?.price || 0}
                  </span>
                </div>
                <div className="bg-white p-4 rounded-[5px]">
                  <span className="text-slate-500">Payment Status:</span>
                  <span className={`font-semibold ml-2 ${
                    formData.paymentType === 'full' ? 'text-green-600' :
                    formData.paymentType === 'partial' ? 'text-blue-600' : 'text-orange-600'
                  }`}>
                    {formData.paymentType === 'full' && `Paid: ৳${packages.find(p => p._id === formData.packageId)?.price || 0}`}
                    {formData.paymentType === 'partial' && `Paid: ৳${formData.initialPayment || 0}, Due: ৳${(packages.find(p => p._id === formData.packageId)?.price || 0) - (parseFloat(formData.initialPayment) || 0)}`}
                    {formData.paymentType === 'due' && `Due: ৳${packages.find(p => p._id === formData.packageId)?.price || 0}`}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Submit Button */}
          <div className="flex justify-end space-x-4 pt-6 border-t border-slate-200">
            <button
              type="button"
              onClick={() => navigate('/members')}
              className="px-6 py-3 border border-slate-200 text-slate-700 rounded-[5px] hover:bg-slate-50 transition-all duration-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-8 py-3 bg-slate-900 text-white rounded-[5px] hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
            >
              {loading ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Creating Member...
                </div>
              ) : (
                'Create Member'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddMember;