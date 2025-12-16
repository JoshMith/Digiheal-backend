import nodemailer, { Transporter } from 'nodemailer';
import { config } from '../config/env.js';
import logger from '../utils/logger.js';
import prisma from '../config/database.js';
import { NotificationType, Priority } from '@prisma/client';

class NotificationService {
  private transporter: Transporter | null = null;

  constructor() {
    this.initializeTransporter();
  }

  private initializeTransporter() {
    const emailConfig = (config as any).email;
    if (emailConfig?.host && emailConfig?.user && emailConfig?.pass) {
      this.transporter = nodemailer.createTransport({
        host: emailConfig.host,
        port: emailConfig.port,
        secure: emailConfig.secure,
        auth: {
          user: emailConfig.user,
          pass: emailConfig.pass,
        },
      });

      logger.info('Email transporter initialized');
    } else {
      logger.warn('Email configuration missing. Email notifications disabled.');
    }
  }

  /**
   * Create notification in database
   */
  async createNotification(data: {
    patientId: string;
    type: NotificationType;
    title: string;
    message: string;
    priority?: Priority;
  }) {
    try {
      const notification = await prisma.notification.create({
        data: {
          patientId: data.patientId,
          type: data.type,
          title: data.title,
          message: data.message,
          priority: data.priority || Priority.NORMAL,
        },
      });

      logger.info(`Notification created: ${notification.id}`);
      return notification;
    } catch (error) {
      logger.error('Error creating notification:', error);
      throw error;
    }
  }

  /**
   * Send email notification
   */
  async sendEmail(to: string, subject: string, html: string) {
    if (!this.transporter) {
      logger.warn('Email transporter not configured. Skipping email send.');
      return null;
    }

    try {
      const emailConfig = (config as any).email;
      const info = await this.transporter.sendMail({
        from: emailConfig.from,
        to,
        subject,
        html,
      });

      logger.info(`Email sent: ${info.messageId}`);
      return info;
    } catch (error) {
      logger.error('Error sending email:', error);
      throw error;
    }
  }

  /**
   * Send appointment reminder
   */
  async sendAppointmentReminder(appointmentId: string) {
    try {
      const appointment = await prisma.appointment.findUnique({
        where: { id: appointmentId },
        include: {
          patient: {
            include: { user: true },
          },
          staff: true,
        },
      });

      if (!appointment) {
        throw new Error('Appointment not found');
      }

      const { patient } = appointment;
      const appointmentDate = new Date(appointment.appointmentDate);
      const formattedDate = appointmentDate.toLocaleDateString('en-KE', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });

      // Create in-app notification
      await this.createNotification({
        patientId: patient.id,
        type: 'APPOINTMENT_REMINDER',
        title: 'Appointment Reminder',
        message: `Your appointment is scheduled for ${formattedDate} at ${appointment.appointmentTime}`,
        priority: Priority.NORMAL,
      });

      // Send email
      const emailHtml = `
        <h2>Appointment Reminder</h2>
        <p>Dear ${patient.firstName} ${patient.lastName},</p>
        <p>This is a reminder about your upcoming appointment:</p>
        <ul>
          <li><strong>Date:</strong> ${formattedDate}</li>
          <li><strong>Time:</strong> ${appointment.appointmentTime}</li>
          <li><strong>Department:</strong> ${appointment.department}</li>
          <li><strong>Type:</strong> ${appointment.appointmentType}</li>
        </ul>
        <p>Please arrive 15 minutes before your scheduled time.</p>
        <p>Best regards,<br>DKUT Medical Center</p>
      `;

      await this.sendEmail(
        patient.user.email,
        'Appointment Reminder - DKUT Medical Center',
        emailHtml
      );

      logger.info(`Appointment reminder sent for ${appointmentId}`);
    } catch (error) {
      logger.error('Error sending appointment reminder:', error);
      throw error;
    }
  }

  /**
   * Send appointment confirmation
   */
  async sendAppointmentConfirmation(appointmentId: string) {
    try {
      const appointment = await prisma.appointment.findUnique({
        where: { id: appointmentId },
        include: {
          patient: {
            include: { user: true },
          },
        },
      });

      if (!appointment) {
        throw new Error('Appointment not found');
      }

      const { patient } = appointment;
      const appointmentDate = new Date(appointment.appointmentDate);
      const formattedDate = appointmentDate.toLocaleDateString('en-KE', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });

      // Create notification
      await this.createNotification({
        patientId: patient.id,
        type: 'APPOINTMENT_CONFIRMATION',
        title: 'Appointment Confirmed',
        message: `Your appointment has been confirmed for ${formattedDate} at ${appointment.appointmentTime}`,
        priority: Priority.NORMAL,
      });

      // Send email
      const emailHtml = `
        <h2>Appointment Confirmation</h2>
        <p>Dear ${patient.firstName} ${patient.lastName},</p>
        <p>Your appointment has been successfully scheduled:</p>
        <ul>
          <li><strong>Date:</strong> ${formattedDate}</li>
          <li><strong>Time:</strong> ${appointment.appointmentTime}</li>
          <li><strong>Department:</strong> ${appointment.department}</li>
          <li><strong>Type:</strong> ${appointment.appointmentType}</li>
        </ul>
        <p>If you need to reschedule or cancel, please contact us at least 24 hours in advance.</p>
        <p>Best regards,<br>DKUT Medical Center</p>
      `;

      await this.sendEmail(
        patient.user.email,
        'Appointment Confirmed - DKUT Medical Center',
        emailHtml
      );

      logger.info(`Appointment confirmation sent for ${appointmentId}`);
    } catch (error) {
      logger.error('Error sending appointment confirmation:', error);
      throw error;
    }
  }

  /**
   * Send urgent health alert
   */
  async sendUrgentHealthAlert(patientId: string, message: string) {
    try {
      const patient = await prisma.patient.findUnique({
        where: { id: patientId },
        include: { user: true },
      });

      if (!patient) {
        throw new Error('Patient not found');
      }

      // Create notification
      await this.createNotification({
        patientId,
        type: 'URGENT_HEALTH_ALERT',
        title: 'Urgent Health Alert',
        message,
        priority: Priority.URGENT,
      });

      // Send email
      const emailHtml = `
        <h2 style="color: #dc2626;">Urgent Health Alert</h2>
        <p>Dear ${patient.firstName} ${patient.lastName},</p>
        <p><strong>${message}</strong></p>
        <p>Please contact DKUT Medical Center immediately or visit the emergency department.</p>
        <p><strong>Emergency Contact:</strong> +254-XXX-XXXXXX</p>
        <p>Best regards,<br>DKUT Medical Center</p>
      `;

      await this.sendEmail(
        patient.user.email,
        'URGENT: Health Alert - DKUT Medical Center',
        emailHtml
      );

      logger.info(`Urgent health alert sent to patient ${patientId}`);
    } catch (error) {
      logger.error('Error sending urgent health alert:', error);
      throw error;
    }
  }

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId: string) {
    try {
      const notification = await prisma.notification.update({
        where: { id: notificationId },
        data: {
          read: true,
          readAt: new Date(),
        },
      });

      return notification;
    } catch (error) {
      logger.error('Error marking notification as read:', error);
      throw error;
    }
  }

  /**
   * Mark all notifications as read for a patient
   */
  async markAllAsRead(patientId: string) {
    try {
      await prisma.notification.updateMany({
        where: {
          patientId,
          read: false,
        },
        data: {
          read: true,
          readAt: new Date(),
        },
      });

      logger.info(`All notifications marked as read for patient ${patientId}`);
    } catch (error) {
      logger.error('Error marking all notifications as read:', error);
      throw error;
    }
  }

  /**
   * Get unread count for a patient
   */
  async getUnreadCount(patientId: string): Promise<number> {
    try {
      const count = await prisma.notification.count({
        where: {
          patientId,
          read: false,
        },
      });

      return count;
    } catch (error) {
      logger.error('Error getting unread count:', error);
      throw error;
    }
  }
}

export default new NotificationService();