import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { useNavigate, useParams } from 'react-router-dom';

const EditMember = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    address: '',
    gender: '',
    joinDate: '',
    packageId: '',
    totalAmount: 0,
    paidAmount: 0,
    dueAmount: 0,
    paymentType: 'none',
    additionalPayment: '',
  });
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchPackages();
    fetchMember();
  }, [id]);

  const fetchPackages = async () => {
    try {
      const res = await api.get('/packages');
      setPackages(res.data.data);
    } catch (error) {
      console.error('Error fetching packages:', error);
    }
  };

  const fetchMember = async () => {
    try {
      const res = await api.get(`/members/${id}`);
      const member = res.data.data;
      
      // Format date for input (YYYY-MM-DD)
      const joinDate = new Date(member.joinDate);
      const formattedDate = joinDate.toISOString().split('T')[0];
      
      setFormData({
        name: member.name,
        phone: member.phone,
        address: member.address || '',
        gender: member.gender,
        joinDate: formattedDate,
        packageId: member.packageId._id,
        totalAmount: member.totalAmount || 0,
        paidAmount: member.paidAmount || 0,
        dueAmount: member.dueAmount || 0,
        paymentType: 'none',
        additionalPayment: '',
      });
    } catch (error) {
      console.error('Error fetching member:', error);
      alert('Error loading member. Redirecting to members list.');
      navigate('/members');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      // Validate payment amount
      if ((formData.paymentType === 'partial' || formData.paymentType === 'full') && formData.additionalPayment) {
        const paymentAmount = parseFloat(formData.additionalPayment) || 0;
        if (paymentAmount <= 0) {
          alert('Please enter a valid payment amount greater than 0');
          setSubmitting(false);
          return;
        }
        if (paymentAmount > formData.dueAmount) {
          alert(`Payment amount cannot exceed due amount of ৳${formData.dueAmount}`);
          setSubmitting(false);
          return;
        }
      }

      const submitData = {
        ...formData,
        additionalPayment: (formData.paymentType === 'partial' || formData.paymentType === 'full') ? parseFloat(formData.additionalPayment) : undefined,
      };

      await api.put(`/members/${id}`, submitData);
      navigate('/members');
    } catch (error) {
      console.error('Error updating member:', error);
      alert('Error updating member. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-cyan-600 rounded-[5px] p-8 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">Edit Member</h1>
            <p className="text-blue-100">Update member information</p>
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="bg-white rounded-[5px] shadow-xl p-8">
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Personal Information */}
          <div>
            <h2 className="text-2xl font-bold text-gray-800 mb-6">
              Personal Information
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Full Name *
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-[5px] focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                  placeholder="Enter full name"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Phone Number *
                </label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-[5px] focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                  placeholder="Enter phone number"
                  required
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Address
                </label>
                <textarea
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  rows="3"
                  className="w-full px-4 py-3 border border-gray-300 rounded-[5px] focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 resize-none"
                  placeholder="Enter address (optional)"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Gender *
                </label>
                <select
                  name="gender"
                  value={formData.gender}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-[5px] focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
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
            <h2 className="text-2xl font-bold text-gray-800 mb-6">
              Membership Details
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Join Date *
                </label>
                <input
                  type="date"
                  name="joinDate"
                  value={formData.joinDate}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-[5px] focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Package *
                </label>
                <select
                  name="packageId"
                  value={formData.packageId}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-[5px] focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                  required
                >
                  <option value="">Select Package</option>
                  {packages.map((pkg) => (
                    <option key={pkg._id} value={pkg._id}>
                      {pkg.name} - ৳{pkg.price} ({pkg.duration} days)
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Payment Options */}
          <div>
            <h2 className="text-2xl font-bold text-gray-800 mb-6">
              Payment Options
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  Add Payment
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
                    <div className="p-4 border-2 border-gray-200 rounded-[5px] cursor-pointer peer-checked:border-green-500 peer-checked:bg-green-50 transition-all duration-200 hover:border-green-300">
                      <div className="text-center">
                        <div className="text-lg font-semibold text-gray-800">Pay Full Due</div>
                        <div className="text-sm text-gray-600">Pay remaining ৳{formData.dueAmount || 0}</div>
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
                    <div className="p-4 border-2 border-gray-200 rounded-[5px] cursor-pointer peer-checked:border-blue-500 peer-checked:bg-blue-50 transition-all duration-200 hover:border-blue-300">
                      <div className="text-center">
                        <div className="text-lg font-semibold text-gray-800">Partial Payment</div>
                        <div className="text-sm text-gray-600">Pay part of due amount</div>
                      </div>
                    </div>
                  </label>
                  <label className="relative">
                    <input
                      type="radio"
                      name="paymentType"
                      value="none"
                      checked={!formData.paymentType || formData.paymentType === 'none'}
                      onChange={handleChange}
                      className="sr-only peer"
                    />
                    <div className="p-4 border-2 border-gray-200 rounded-[5px] cursor-pointer peer-checked:border-gray-500 peer-checked:bg-gray-50 transition-all duration-200 hover:border-gray-300">
                      <div className="text-center">
                        <div className="text-lg font-semibold text-gray-800">No Payment</div>
                        <div className="text-sm text-gray-600">Update info only</div>
                      </div>
                    </div>
                  </label>
                </div>
              </div>

              {(formData.paymentType === 'partial' || formData.paymentType === 'full') && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Payment Amount *
                  </label>
                  <input
                    type="number"
                    name="additionalPayment"
                    value={formData.additionalPayment || ''}
                    onChange={handleChange}
                    min="0"
                    step="0.01"
                    max={formData.dueAmount || 0}
                    className="w-full px-4 py-3 border border-gray-300 rounded-[5px] focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                    placeholder="Enter payment amount"
                    required={formData.paymentType === 'partial' || formData.paymentType === 'full'}
                  />
                  <p className="text-sm text-gray-600 mt-1">
                    Maximum amount: ৳{formData.dueAmount || 0}
                  </p>
                </div>
              )}
            </div>
          </div>
          {formData.packageId && (
            <div className="bg-gradient-to-r from-blue-50 to-cyan-50 rounded-[5px] p-6 border border-blue-200">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">
                Membership Preview
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div className="bg-white p-4 rounded-[5px]">
                  <span className="text-gray-500">Expiry Date:</span>
                  <span className="font-semibold text-gray-800 ml-2">
                    {formData.joinDate && packages.find(p => p._id === formData.packageId) ?
                      new Date(new Date(formData.joinDate).getTime() + packages.find(p => p._id === formData.packageId).duration * 24 * 60 * 60 * 1000).toLocaleDateString()
                      : 'Select join date and package'
                    }
                  </span>
                </div>
                <div className="bg-white p-4 rounded-[5px]">
                  <span className="text-gray-500">Package Price:</span>
                  <span className="font-semibold text-green-600 ml-2">
                    ৳{packages.find(p => p._id === formData.packageId)?.price || 0}
                  </span>
                </div>
                <div className="bg-white p-4 rounded-[5px]">
                  <span className="text-gray-500">Paid Amount:</span>
                  <span className="font-semibold text-blue-600 ml-2">
                    ৳{formData.paidAmount || 0}
                  </span>
                </div>
                <div className="bg-white p-4 rounded-[5px]">
                  <span className="text-gray-500">Due Amount:</span>
                  <span className={`font-semibold ml-2 ${formData.dueAmount > 0 ? 'text-red-600' : 'text-green-600'}`}>
                    ৳{formData.dueAmount || 0}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Submit Button */}
          <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={() => navigate('/members')}
              className="px-6 py-3 border border-gray-300 text-gray-700 rounded-[5px] hover:bg-gray-50 transition-all duration-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-8 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-[5px] hover:from-blue-700 hover:to-cyan-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-105 shadow-lg"
            >
              {submitting ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Updating Member...
                </div>
              ) : (
                'Update Member'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditMember;
