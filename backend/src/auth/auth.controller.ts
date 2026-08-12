import {
  Controller,
  Post,
  Body,
  Res,
  Req,
  Get,
  Query,
  UseGuards,
  Param,
  BadRequestException,
} from '@nestjs/common';
import { Response, Request } from 'express';
import { AuthService } from './auth.service';
import { Roles } from '../common/roles.decorator';
import { RolesGuard } from '../common/roles.guard';
import { UseGuards as UseGuardsDecorator } from '@nestjs/common';
import { JwtAuthGuard } from '../common/jwt-auth.guard';
import { CurrentUser, RequestUser } from '../common/current-user.decorator';
import { IsEmail, IsString, MinLength, IsOptional, IsIn } from 'class-validator';

class RegisterDto {
  @IsEmail() email: string;
  @IsString() @MinLength(8) password: string;
  @IsString() @MinLength(2) displayName: string;
  @IsOptional() @IsIn(['DE', 'FR', 'IT', 'EN']) uiLanguage?: 'DE' | 'FR' | 'IT' | 'EN';
}

class LoginDto {
  @IsEmail() email: string;
  @IsString() password: string;
}

class ResetRequestDto {
  @IsEmail() email: string;
}

class ResetConfirmDto {
  @IsString() token: string;
  @IsString() @MinLength(8) newPassword: string;
}

class DeleteAccountDto {
  @IsOptional() transferToUserId?: string;
}

@Controller('auth')
export class AuthController {
  constructor(private auth: AuthService) {}

  private setAuthCookie(res: Response, token: string) {
    res.cookie('access_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
  }

  @Post('register')
  async register(@Body() dto: RegisterDto) {
    return this.auth.register(dto.email, dto.password, dto.displayName, (dto.uiLanguage as any) || 'DE');
  }

  @Post('login')
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
    const result = await this.auth.login(dto.email, dto.password);
    this.setAuthCookie(res, result.accessToken);
    return { accessToken: result.accessToken };
  }

  @Post('logout')
  logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie('access_token');
    return { ok: true };
  }

  // --- OAuth Start (Google) ---
  @Get('google')
  googleAuth(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const url = this.buildGoogleAuthUrl(req);
    return res.redirect(url);
  }

  // --- OAuth Callback (Google) ---
  @Get('google/callback')
  async googleCallback(@Query('code') code: string, @Res({ passthrough: true }) res: Response) {
    if (!code) throw new BadRequestException('Kein Code von Google erhalten.');
    // Token-Austausch und Profilabruf (vereinfacht via fetch)
    const profile = await this.exchangeGoogleCode(code);
    const result = await this.auth.oauthLogin(
      'GOOGLE' as any,
      profile.id,
      profile.email,
      profile.name,
    );
    if (result.status === 'active' && 'accessToken' in result && result.accessToken) {
      this.setAuthCookie(res, result.accessToken);
      return res.redirect(`${process.env.PUBLIC_BASE_URL || ''}/de/dashboard`);
    }
    return res.redirect(`${process.env.PUBLIC_BASE_URL || ''}/de/pending`);
  }

  // --- OAuth Start (Microsoft) ---
  @Get('microsoft')
  microsoftAuth(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const url = this.buildMicrosoftAuthUrl(req);
    return res.redirect(url);
  }

  @Get('microsoft/callback')
  async microsoftCallback(@Query('code') code: string, @Res({ passthrough: true }) res: Response) {
    if (!code) throw new BadRequestException('Kein Code von Microsoft erhalten.');
    const profile = await this.exchangeMicrosoftCode(code);
    const result = await this.auth.oauthLogin(
      'MICROSOFT' as any,
      profile.id,
      profile.email,
      profile.name,
    );
    if (result.status === 'active' && 'accessToken' in result && result.accessToken) {
      this.setAuthCookie(res, result.accessToken);
      return res.redirect(`${process.env.PUBLIC_BASE_URL || ''}/de/dashboard`);
    }
    return res.redirect(`${process.env.PUBLIC_BASE_URL || ''}/de/pending`);
  }

  // --- Passwort-Reset (FA-AUTH-005) ---
  @Post('password-reset/request')
  async requestReset(@Body() dto: ResetRequestDto) {
    await this.auth.requestPasswordReset(dto.email);
    return { ok: true }; // immer 200 (keine Enumeration)
  }

  @Post('password-reset/confirm')
  async confirmReset(@Body() dto: ResetConfirmDto) {
    await this.auth.resetPassword(dto.token, dto.newPassword);
    return { ok: true };
  }

  // --- Konto löschen (FA-AUTH-007/008) ---
  @UseGuardsDecorator(JwtAuthGuard)
  @Post('delete-account')
  async deleteAccount(@CurrentUser() user: RequestUser, @Body() dto: DeleteAccountDto) {
    return this.auth.softDelete(user.id, dto.transferToUserId);
  }

  @Post('reactivate')
  async reactivate(@Body('email') email: string) {
    return this.auth.reactivate(email);
  }

  // --- Helfer: OAuth-URLs & Code-Austausch -------------------------------

  private buildGoogleAuthUrl(req: Request): string {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    if (!clientId) throw new BadRequestException('Google OAuth nicht konfiguriert.');
    const redirectUri = `${process.env.BACKEND_PUBLIC_URL || process.env.PUBLIC_BASE_URL}/auth/google/callback`;
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'openid email profile',
      access_type: 'offline',
      prompt: 'select_account',
    });
    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  }

  private async exchangeGoogleCode(code: string) {
    const redirectUri = `${process.env.BACKEND_PUBLIC_URL || process.env.PUBLIC_BASE_URL}/auth/google/callback`;
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID || '',
        client_secret: process.env.GOOGLE_CLIENT_SECRET || '',
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });
    if (!tokenRes.ok) throw new BadRequestException('Google Token-Austausch fehlgeschlagen.');
    const tokens = await tokenRes.json();
    const infoRes = await fetch('https://openidconnect.googleapis.com/v1/userinfo', {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });
    const info = await infoRes.json();
    return { id: info.sub, email: info.email, name: info.name };
  }

  private buildMicrosoftAuthUrl(req: Request): string {
    const clientId = process.env.MICROSOFT_CLIENT_ID;
    if (!clientId) throw new BadRequestException('Microsoft OAuth nicht konfiguriert.');
    const tenant = process.env.MICROSOFT_TENANT || 'common';
    const redirectUri = `${process.env.BACKEND_PUBLIC_URL || process.env.PUBLIC_BASE_URL}/auth/microsoft/callback`;
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'openid email profile User.Read',
      response_mode: 'query',
    });
    return `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/authorize?${params.toString()}`;
  }

  private async exchangeMicrosoftCode(code: string) {
    const tenant = process.env.MICROSOFT_TENANT || 'common';
    const redirectUri = `${process.env.BACKEND_PUBLIC_URL || process.env.PUBLIC_BASE_URL}/auth/microsoft/callback`;
    const tokenRes = await fetch(`https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: process.env.MICROSOFT_CLIENT_ID || '',
        client_secret: process.env.MICROSOFT_CLIENT_SECRET || '',
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
        scope: 'openid email profile User.Read',
      }),
    });
    if (!tokenRes.ok) throw new BadRequestException('Microsoft Token-Austausch fehlgeschlagen.');
    const tokens = await tokenRes.json();
    const infoRes = await fetch('https://graph.microsoft.com/oidc/userinfo', {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });
    const info = await infoRes.json();
    return { id: info.sub, email: info.email, name: info.name || info.given_name };
  }
}