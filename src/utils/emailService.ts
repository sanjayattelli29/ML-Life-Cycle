import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  auth: {
    user: 'editwithsanjay@gmail.com',
    pass: process.env.EMAIL_PASSWORD, // Add this to your .env file
  },
});

export interface EmailOptions {
  to: string;
  subject: string;
  text?: string;
  html?: string;
}

export async function sendEmail(options: EmailOptions): Promise<boolean> {
  try {
    console.log('Attempting to send email to:', options.to);
    console.log('Using SMTP configuration:', {
      host: 'smtp.gmail.com',
      port: 587,
      secure: false,
      auth: {
        user: 'editwithsanjay@gmail.com',
        // Not logging password for security
      }
    });

    const info = await transporter.sendMail({
      from: '"DataViz-AI Platform" <editwithsanjay@gmail.com>',
      to: options.to,
      subject: options.subject,
      text: options.text,
      html: options.html,
    });

    console.log('Email sent successfully:', {
      messageId: info.messageId,
      response: info.response
    });

    return true;
  } catch (error) {
    console.error('Detailed error sending email:', {
      error: error.message,
      code: error.code,
      command: error.command,
      response: error.response
    });
    return false;
  }
}

export function generateWelcomeEmail(name: string): { text: string; html: string } {
  const text = `Hi ${name}, welcome to DataViz-AI! Transform your data into actionable insights with our revolutionary AI-powered platform. Enjoy 5 FREE data analysis uploads to get started!`;
  
  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Welcome to DataViz-AI</title>
    </head>
    <body style="margin: 0; padding: 0; background: linear-gradient(135deg, #0f0f23 0%, #1a1a2e 100%); font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
      <div style="max-width: 650px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 20px 40px rgba(0,0,0,0.1);">
        
        <!-- Header Section -->
        <div style="background: linear-gradient(135deg, #0f0f23 0%, #1a1a2e 100%); padding: 40px 30px; text-align: center; position: relative; overflow: hidden;">
          <!-- Subtle decorative elements -->
          <div style="position: absolute; top: -30px; right: -30px; width: 60px; height: 60px; background: rgba(255, 107, 53, 0.1); border-radius: 50%; opacity: 0.8;"></div>
          <div style="position: absolute; bottom: -20px; left: -20px; width: 40px; height: 40px; background: rgba(255, 107, 53, 0.1); border-radius: 50%; opacity: 0.6;"></div>
          
          <div style="position: relative; z-index: 2;">
            <h1 style="color: #ffffff; font-size: 36px; font-weight: 700; margin: 0 0 10px 0; letter-spacing: -0.5px;">
              Welcome ${name}! 👋
            </h1>
            <p style="color: rgba(255,255,255,0.8); font-size: 16px; margin: 0; font-weight: 400;">
              Ready to transform your data into insights
            </p>
          </div>
        </div>

        <!-- Free Offer Banner -->
        <div style="background: linear-gradient(90deg, #ff6b35, #f7931e); padding: 20px; text-align: center; position: relative;">
          <div style="position: relative; z-index: 2;">
            <h2 style="color: #ffffff; font-size: 20px; font-weight: 600; margin: 0 0 5px 0;">
              🎁 5 FREE Data Analysis Uploads
            </h2>
            <p style="color: rgba(255,255,255,0.9); font-size: 14px; margin: 0; font-weight: 400;">
              No credit card required • Start in under 2 minutes
            </p>
          </div>
        </div>

        <!-- Main Content -->
        <div style="padding: 40px 30px;">
          
          <!-- Platform Introduction -->
          <div style="text-align: center; margin-bottom: 40px;">
            <h2 style="color: #1a1a2e; font-size: 32px; font-weight: 700; margin: 0 0 15px 0; line-height: 1.2;">
              Smart Data Analyser
            </h2>
            <p style="color: #6b7280; font-size: 12px; margin: 0 0 10px 0; text-transform: uppercase; letter-spacing: 1px; font-weight: 500;">
              POWERED BY
            </p>
            <h3 style="color: #ff6b35; font-size: 18px; font-weight: 600; margin: 0 0 20px 0; font-style: italic;">
              AI Agents & Deep Learning
            </h3>
            <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin: 0; max-width: 480px; margin: 0 auto;">
              Transform your data into <strong style="color: #1a1a2e;">actionable insights</strong> with our AI-powered platform. Analyze, visualize, and predict with <strong style="color: #ff6b35;">exceptional accuracy</strong>.
            </p>
          </div>

          <!-- CTA Buttons -->
          <div style="text-align: center; margin: 30px 0 40px 0;">
            <a href="https://dataviz-ai.netlify.app/dashboard" style="display: inline-block; background: linear-gradient(135deg, #ff6b35 0%, #f7931e 100%); color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; margin: 0 8px 10px 0; box-shadow: 0 4px 20px rgba(255, 107, 53, 0.25); transition: all 0.3s ease;">
              🚀 Get Started
            </a>
            <a href="https://dataviz-ai.netlify.app/" style="display: inline-block; background: transparent; color: #ff6b35; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; margin: 0 8px 10px 0; border: 2px solid #ff6b35; transition: all 0.3s ease;">
              📺 Watch Demo
            </a>
          </div>

          <!-- Features Grid -->
          <div style="margin: 40px 0;">
            <h3 style="color: #1a1a2e; font-size: 24px; font-weight: 600; text-align: center; margin: 0 0 30px 0;">
              Why Choose DataViz-AI?
            </h3>

            <!-- AI Features -->
            <div style="background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%); border-radius: 12px; padding: 25px; margin: 20px 0; border: 1px solid #e2e8f0; position: relative;">
              <div style="position: relative; z-index: 2;">
                <div style="display: flex; align-items: center; margin-bottom: 15px;">
                  <div style="width: 40px; height: 40px; background: linear-gradient(135deg, #ff6b35, #f7931e); border-radius: 8px; display: flex; align-items: center; justify-content: center; margin-right: 15px; font-size: 18px;">🤖</div>
                  <div>
                    <h4 style="margin: 0; font-size: 18px; font-weight: 600; color: #1a1a2e;">AI-Powered Insights</h4>
                    <p style="margin: 0; font-size: 12px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px;">REVOLUTIONARY TECHNOLOGY</p>
                  </div>
                </div>
                <p style="margin: 0; font-size: 14px; line-height: 1.5; color: #4b5563;">
                  Advanced machine learning algorithms transform raw data into <strong>intelligent predictions</strong> and <strong>automated workflows</strong>.
                </p>
                <div style="margin-top: 15px; display: flex; flex-wrap: wrap; gap: 8px;">
                  <span style="background: rgba(255, 107, 53, 0.1); color: #ff6b35; padding: 4px 12px; border-radius: 16px; font-size: 12px; font-weight: 500;">🔮 Smart Insights</span>
                  <span style="background: rgba(255, 107, 53, 0.1); color: #ff6b35; padding: 4px 12px; border-radius: 16px; font-size: 12px; font-weight: 500;">🛠️ Auto Processing</span>
                </div>
              </div>
            </div>

            <!-- Quality Assurance -->
            <div style="background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%); border-radius: 12px; padding: 25px; margin: 20px 0; border: 1px solid #e2e8f0; position: relative;">
              <div style="position: relative; z-index: 2;">
                <div style="display: flex; align-items: center; margin-bottom: 15px;">
                  <div style="width: 40px; height: 40px; background: linear-gradient(135deg, #1a1a2e, #0f0f23); border-radius: 8px; display: flex; align-items: center; justify-content: center; margin-right: 15px; font-size: 18px;">📊</div>
                  <div>
                    <h4 style="margin: 0; font-size: 18px; font-weight: 600; color: #1a1a2e;">Data Quality Analysis</h4>
                    <p style="margin: 0; font-size: 12px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px;">COMPREHENSIVE ASSESSMENT</p>
                  </div>
                </div>
                <p style="margin: 0; font-size: 14px; line-height: 1.5; color: #4b5563;">
                  Ensure data integrity with comprehensive quality tools that provide <strong>metric analysis</strong> and <strong>quality reports</strong>.
                </p>
                <div style="margin-top: 15px; display: flex; flex-wrap: wrap; gap: 8px;">
                  <span style="background: rgba(26, 26, 46, 0.1); color: #1a1a2e; padding: 4px 12px; border-radius: 16px; font-size: 12px; font-weight: 500;">📈 Metrics</span>
                  <span style="background: rgba(26, 26, 46, 0.1); color: #1a1a2e; padding: 4px 12px; border-radius: 16px; font-size: 12px; font-weight: 500;">✅ Quality Reports</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Platform Features -->
          <div style="background: #f9fafb; border-radius: 12px; padding: 30px 25px; margin: 30px 0; border: 1px solid #f3f4f6;">
            <h3 style="color: #1a1a2e; font-size: 20px; font-weight: 600; text-align: center; margin: 0 0 25px 0;">
              Platform Features
            </h3>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 20px; margin-top: 20px;">
              <div style="text-align: center; padding: 15px;">
                <div style="font-size: 28px; margin-bottom: 8px;">📊</div>
                <h5 style="color: #1a1a2e; font-size: 14px; font-weight: 600; margin: 0 0 5px 0;">10+ Chart Types</h5>
                <p style="color: #6b7280; font-size: 12px; margin: 0; line-height: 1.3;">Comprehensive visualizations</p>
              </div>
              <div style="text-align: center; padding: 15px;">
                <div style="font-size: 28px; margin-bottom: 8px;">🧠</div>
                <h5 style="color: #1a1a2e; font-size: 14px; font-weight: 600; margin: 0 0 5px 0;">Smart Analysis</h5>
                <p style="color: #6b7280; font-size: 12px; margin: 0; line-height: 1.3;">AI-powered insights</p>
              </div>
              <div style="text-align: center; padding: 15px;">
                <div style="font-size: 28px; margin-bottom: 8px;">⚡</div>
                <h5 style="color: #1a1a2e; font-size: 14px; font-weight: 600; margin: 0 0 5px 0;">Lightning Fast</h5>
                <p style="color: #6b7280; font-size: 12px; margin: 0; line-height: 1.3;">Real-time processing</p>
              </div>
              <div style="text-align: center; padding: 15px;">
                <div style="font-size: 28px; margin-bottom: 8px;">☁️</div>
                <h5 style="color: #1a1a2e; font-size: 14px; font-weight: 600; margin: 0 0 5px 0;">5MB Storage</h5>
                <p style="color: #6b7280; font-size: 12px; margin: 0; line-height: 1.3;">Secure cloud storage</p>
              </div>
            </div>
          </div>

          <!-- Final CTA -->
          <div style="text-align: center; margin: 40px 0 20px 0; padding: 30px; background: linear-gradient(135deg, #1a1a2e 0%, #0f0f23 100%); border-radius: 12px; color: white; position: relative; overflow: hidden;">
            <div style="position: absolute; top: -20px; right: -20px; width: 60px; height: 60px; background: rgba(255, 107, 53, 0.1); border-radius: 50%; opacity: 0.7;"></div>
            <div style="position: relative; z-index: 2;">
              <h3 style="margin: 0 0 12px 0; font-size: 24px; font-weight: 600;">
                Ready to Transform Your Data? 🚀
              </h3>
              <p style="margin: 0 0 20px 0; font-size: 14px; opacity: 0.9; line-height: 1.5;">
                Join thousands of users experiencing the future of data analysis
              </p>
              <a href="https://dataviz-ai.netlify.app/dashboard" style="display: inline-block; background: linear-gradient(135deg, #ff6b35 0%, #f7931e 100%); color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 20px rgba(255, 107, 53, 0.3); transition: all 0.3s ease;">
                🎯 Start Your Journey
              </a>
            </div>
          </div>
        </div>

        <!-- Footer -->
        <div style="background: #f9fafb; padding: 25px; text-align: center; color: #6b7280; border-top: 1px solid #f3f4f6;">
          <div style="margin-bottom: 15px;">
            <a href="https://dataviz-ai.netlify.app/" style="color: #ff6b35; text-decoration: none; font-weight: 500; margin: 0 12px; font-size: 14px;">🌐 Website</a>
            <a href="https://dataviz-ai.netlify.app/support" style="color: #ff6b35; text-decoration: none; font-weight: 500; margin: 0 12px; font-size: 14px;">💬 Support</a>
            <a href="https://dataviz-ai.netlify.app/docs" style="color: #ff6b35; text-decoration: none; font-weight: 500; margin: 0 12px; font-size: 14px;">📚 Docs</a>
          </div>
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 15px 0;">
          <p style="margin: 0; font-size: 12px; opacity: 0.8;">
            © 2025 DataViz-AI Platform. This is an automated message.
          </p>
          <p style="margin: 8px 0 0 0; font-size: 11px; opacity: 0.6;">
            Transform your data into actionable insights with AI precision.
          </p>
        </div>
      </div>
    </body>
    </html>
  `;

  return { text, html };
}

export function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export function generateOTPEmail(otp: string): { text: string; html: string } {
  const text = `Your DataViz-AI verification code is: ${otp}. This code will expire in 10 minutes.`;
  
  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Email Verification - DataViz-AI</title>
    </head>
    <body style="margin: 0; padding: 0; background: linear-gradient(135deg, #0f0f23 0%, #1a1a2e 100%); font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
      <div style="max-width: 650px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 20px 40px rgba(0,0,0,0.1);">
        <div style="background: linear-gradient(135deg, #0f0f23 0%, #1a1a2e 100%); padding: 40px 30px; text-align: center;">
          <h1 style="color: #ffffff; font-size: 36px; font-weight: 700; margin: 0 0 10px 0;">
            Verify Your Email
          </h1>
        </div>
        
        <div style="padding: 40px 30px; text-align: center;">
          <p style="font-size: 18px; color: #1a1a2e; margin-bottom: 30px;">
            Here's your verification code:
          </p>
          <div style="background: #f5f5f5; padding: 20px; border-radius: 10px; margin-bottom: 30px;">
            <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #1a1a2e;">
              ${otp}
            </span>
          </div>
          <p style="font-size: 14px; color: #666; margin-bottom: 0;">
            This code will expire in 10 minutes.<br>
            If you didn't request this code, please ignore this email.
          </p>
        </div>
      </div>
    </body>
    </html>
  `;

  return { text, html };
}

export async function sendOTPEmail(email: string, otp: string): Promise<boolean> {
  const { text, html } = generateOTPEmail(otp);
  return await sendEmail({
    to: email,
    subject: 'Verify Your Email - DataViz-AI',
    text,
    html,
  });
}























