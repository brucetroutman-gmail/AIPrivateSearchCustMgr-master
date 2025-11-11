 
 
import { secureFs } from '../utils/secureFileOps.mjs';
import path from 'path';
import crypto from 'crypto';
import { USER_DEFAULTS } from './userDefaults.mjs';

export class UserManager {
  constructor() {
    this.usersFile = '/Users/Shared/AIPrivateSearch/data/users.json';
    this.sessionsFile = '/Users/Shared/AIPrivateSearch/data/sessions.json';
    this.ensureDataDirectory();
  }

  async ensureDataDirectory() {
    const dataDir = path.dirname(this.usersFile);
    try {
      await secureFs.mkdir(dataDir, { recursive: true });
    } catch (error) {
      // Directory might already exist
    }
  }

  async loadUsers() {
    try {
      const data = await secureFs.readFile(this.usersFile, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      return [];
    }
  }

  async saveUsers(users) {
    await this.ensureDataDirectory();
    await secureFs.writeFile(this.usersFile, JSON.stringify(users, null, 2));
  }

  async loadSessions() {
    try {
      const data = await secureFs.readFile(this.sessionsFile, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      return {};
    }
  }

  async saveSessions(sessions) {
    await this.ensureDataDirectory();
    await secureFs.writeFile(this.sessionsFile, JSON.stringify(sessions, null, 2));
  }

  generateId() {
    return crypto.randomUUID();
  }

  hashPassword(password) {
    return crypto.createHash('sha256').update(password).digest('hex');
  }

  async createUser(email, password, subscriptionTier = USER_DEFAULTS.SUBSCRIPTION_TIER, userRole = USER_DEFAULTS.USER_ROLE) {
    const users = await this.loadUsers();
    
    if (users.find(u => u.email === email)) {
      throw new Error('User already exists');
    }

    const user = {
      id: this.generateId(),
      email,
      passwordHash: this.hashPassword(password),
      subscriptionTier, // standard, premium, professional
      userRole, // admin, searcher
      createdAt: new Date().toISOString(),
      lastLogin: null,
      active: true
    };

    users.push(user);
    await this.saveUsers(users);
    
    const { passwordHash, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  async authenticateUser(email, password) {
    const users = await this.loadUsers();
    const user = users.find(u => u.email === email && u.active);
    
    if (!user || user.passwordHash !== this.hashPassword(password)) {
      throw new Error('Invalid credentials');
    }

    user.lastLogin = new Date().toISOString();
    await this.saveUsers(users);

    const { passwordHash, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  async getTokenTimeout() {
    try {
      const configPath = path.join(process.cwd(), '../../client/c01_client-first-app/config/app.json');
      const configData = await secureFs.readFile(configPath, 'utf8');
      const config = JSON.parse(configData);
      return (config['bearer-token-timeout'] || 300) * 1000; // Convert seconds to milliseconds
    } catch (error) {
      return 300 * 1000; // Default 300 seconds if config fails
    }
  }

  async createSession(userId) {
    const sessions = await this.loadSessions();
    const sessionId = this.generateId();
    
    const expirationTime = await this.getTokenTimeout();
    
    sessions[sessionId] = {
      userId,
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + expirationTime).toISOString()
    };

    await this.saveSessions(sessions);
    return sessionId;
  }

  async validateSession(sessionId) {
    const sessions = await this.loadSessions();
    const session = sessions[sessionId];
    
    console.log('Session lookup:', sessionId, session ? 'found' : 'not found');
    if (session) {
      console.log('Session expires at:', session.expiresAt);
      console.log('Current time:', new Date().toISOString());
      console.log('Session expired?', new Date(session.expiresAt) < new Date());
    }
    
    if (!session || new Date(session.expiresAt) < new Date()) {
      return null;
    }

    const users = await this.loadUsers();
    console.log('Looking for userId:', session.userId);
    console.log('Available users:', users.map(u => ({ id: u.id, email: u.email, active: u.active })));
    
    const user = users.find(u => u.id === session.userId && u.active);
    
    console.log('User found for session:', user ? user.email : 'not found');
    
    if (!user) {
      const userById = users.find(u => u.id === session.userId);
      if (userById) {
        console.log('User exists but inactive:', userById.email, 'active:', userById.active);
      } else {
        console.log('No user found with ID:', session.userId);
      }
      return null;
    }

    const { passwordHash, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  async deleteSession(sessionId) {
    const sessions = await this.loadSessions();
    delete sessions[sessionId];
    await this.saveSessions(sessions);
  }

  async getAllUsers() {
    const users = await this.loadUsers();
    return users.map(({ passwordHash, ...user }) => user);
  }

  async updateUser(userId, updates) {
    const users = await this.loadUsers();
    const user = users.find(u => u.id === userId);
    
    if (!user) {
      throw new Error('User not found');
    }

    if (updates.subscriptionTier) user.subscriptionTier = updates.subscriptionTier;
    if (updates.userRole) user.userRole = updates.userRole;
    if (typeof updates.isActive === 'boolean') user.active = updates.isActive;
    if (updates.password) user.passwordHash = this.hashPassword(updates.password);
    if (updates.email) user.email = updates.email;
    
    await this.saveUsers(users);
    
    const { passwordHash, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  async deleteUser(userId) {
    const users = await this.loadUsers();
    const userIndex = users.findIndex(u => u.id === userId);
    
    if (userIndex === -1) {
      throw new Error('User not found');
    }

    users.splice(userIndex, 1);
    await this.saveUsers(users);
    
    // Also delete all sessions for this user
    const sessions = await this.loadSessions();
    const updatedSessions = {};
    for (const [sessionId, session] of Object.entries(sessions)) {
      if (session.userId !== userId) {
        updatedSessions[sessionId] = session;
      }
    }
    await this.saveSessions(updatedSessions);
  }
}