import { Request, Response, NextFunction } from 'express';
import Lead from '../models/Lead';
import { AppError } from '../utils/AppError';
import { z } from 'zod';
import { parse } from 'json2csv';

const leadSchema = z.object({
  name: z.string().min(2, 'Name is required'),
  email: z.string().email('Invalid email address'),
  status: z.enum(['New', 'Contacted', 'Qualified', 'Lost']).optional(),
  source: z.enum(['Website', 'Instagram', 'Referral']),
});

export const createLead = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validatedData = leadSchema.parse(req.body);
    
    const lead = await Lead.create({
      ...validatedData,
      createdBy: req.user?.id
    });

    res.status(201).json({
      success: true,
      data: lead
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      const message = error.issues.map((e: any) => e.message).join(', ');
      return next(new AppError(message, 400));
    }
    next(error);
  }
};

export const getLeads = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { status, source, search, sort, page = 1 } = req.query;
    
    // Pagination (Mandatory: 10 per page)
    const limit = 10;
    const skip = (Number(page) - 1) * limit;

    let query: any = {};

    // Filters
    if (status) query.status = status;
    if (source) query.source = source;
    
    // Search by Name or Email
    if (search) {
      query.$or = [
        { name: { $regex: search as string, $options: 'i' } },
        { email: { $regex: search as string, $options: 'i' } }
      ];
    }

    // Role-based access: Sales Users only see their own leads, Admin sees all
    if (req.user?.role !== 'Admin') {
      query.createdBy = req.user?.id;
    }

    // Sorting
    let sortOptions: any = { createdAt: -1 }; // Latest by default
    if (sort === 'Oldest') {
      sortOptions = { createdAt: 1 };
    }

    const leads = await Lead.find(query)
      .sort(sortOptions)
      .skip(skip)
      .limit(limit)
      .populate('createdBy', 'name email');

    const total = await Lead.countDocuments(query);

    res.status(200).json({
      success: true,
      data: leads,
      pagination: {
        total,
        page: Number(page),
        pages: Math.ceil(total / limit),
        limit
      }
    });
  } catch (error) {
    next(error);
  }
};

export const getLead = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const lead = await Lead.findById(req.params.id).populate('createdBy', 'name email');

    if (!lead) {
      return next(new AppError('Lead not found', 404));
    }

    // Sales User can only access their own leads
    if (req.user?.role !== 'Admin' && lead.createdBy._id.toString() !== req.user?.id) {
      return next(new AppError('Not authorized to access this lead', 403));
    }

    res.status(200).json({
      success: true,
      data: lead
    });
  } catch (error) {
    next(error);
  }
};

export const updateLead = async (req: Request, res: Response, next: NextFunction) => {
  try {
    let lead = await Lead.findById(req.params.id);

    if (!lead) {
      return next(new AppError('Lead not found', 404));
    }

    if (req.user?.role !== 'Admin' && lead.createdBy.toString() !== req.user?.id) {
      return next(new AppError('Not authorized to update this lead', 403));
    }

    // Partial update validation
    const updateSchema = leadSchema.partial();
    const validatedData = updateSchema.parse(req.body);

    lead = await Lead.findByIdAndUpdate(req.params.id, validatedData, {
      new: true,
      runValidators: true
    });

    res.status(200).json({
      success: true,
      data: lead
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      const message = error.issues.map((e: any) => e.message).join(', ');
      return next(new AppError(message, 400));
    }
    next(error);
  }
};

export const deleteLead = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const lead = await Lead.findById(req.params.id);

    if (!lead) {
      return next(new AppError('Lead not found', 404));
    }

    if (req.user?.role !== 'Admin' && lead.createdBy.toString() !== req.user?.id) {
      return next(new AppError('Not authorized to delete this lead', 403));
    }

    await lead.deleteOne();

    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (error) {
    next(error);
  }
};

export const exportLeadsCsv = async (req: Request, res: Response, next: NextFunction) => {
  try {
    let query: any = {};
    if (req.user?.role !== 'Admin') {
      query.createdBy = req.user?.id;
    }

    const leads = await Lead.find(query).populate('createdBy', 'name').lean();

    const csvFields = ['_id', 'name', 'email', 'status', 'source', 'createdAt', 'createdBy.name'];
    const csv = parse(leads, { fields: csvFields });

    res.header('Content-Type', 'text/csv');
    res.attachment('leads.csv');
    return res.send(csv);
  } catch (error) {
    next(error);
  }
};
