# Same IP Address Considerations

## Overview
When running the investment game in a classroom setting, you'll typically have 35-100 students connecting from the same IP address (school network, NAT gateway, or proxy). This document explains how the system handles this scenario.

## How It Works

### ✅ What's Already Handled
1. **Socket.io Design**: Socket.io is specifically designed to handle multiple connections from the same IP address
2. **Unique Socket IDs**: Each student gets a unique socket ID regardless of their IP address
3. **Per-Socket Rate Limiting**: Rate limits are applied per socket, not per IP (correct for classroom use)
4. **WebSocket Protocol**: Lightweight protocol that can handle many concurrent connections

### 📊 Monitoring Features Added
The system now tracks and logs connections per IP address:
- Logs show: `"New user connected: abc123 from IP 192.168.1.1 (35 from this IP, 36/100 total)"`
- Helps identify if all students are connecting successfully
- Useful for troubleshooting connection issues

### ⚙️ Socket.io Optimizations
The server is configured with classroom-friendly settings:
```javascript
{
  pingTimeout: 60000,        // 60 seconds before considering connection dead
  pingInterval: 25000,       // Check connection health every 25 seconds
  upgradeTimeout: 30000,     // 30 seconds to complete WebSocket upgrade
  maxHttpBufferSize: 1e6,    // 1MB max message size
  transports: ['websocket', 'polling']  // Prefer WebSocket, fallback to polling
}
```

## Potential Issues & Solutions

### Issue 1: Browser Connection Limits
**Problem**: Some browsers limit concurrent connections to the same domain (typically 6-8)
**Solution**: 
- Students use WebSocket connections (not HTTP requests)
- WebSockets don't count against browser connection limits
- Each student only needs 1 WebSocket connection

### Issue 2: Network Proxy/Firewall
**Problem**: School firewalls might block WebSocket connections
**Solution**:
- Server supports both WebSocket and polling transports
- Automatically falls back to HTTP polling if WebSocket is blocked
- Polling is slower but still functional

### Issue 3: NAT Connection Tracking
**Problem**: Some NAT devices have connection tracking limits
**Solution**:
- Modern NAT devices support 10,000+ concurrent connections
- 100 students = 100 connections (well within limits)
- If issues occur, IT can increase NAT connection table size

### Issue 4: Bandwidth Constraints
**Problem**: 100 students on same network might saturate bandwidth
**Solution**:
- Debounced updates (1 second intervals)
- Rate limiting (2 actions per 0.5 seconds per student)
- Efficient data structures (only send changed data)
- Estimated bandwidth: ~10-20 KB/s per student = 1-2 Mbps for 100 students

## Testing Recommendations

### Before Class
1. **Test with 5-10 devices** from the same network
2. **Check server logs** for IP tracking information
3. **Verify WebSocket connections** (not falling back to polling)
4. **Monitor server CPU/memory** usage

### During Class
1. **Watch the Active Students panel** - should show all connected students
2. **Check server logs** for connection errors
3. **Monitor response times** - investments should complete in <1 second
4. **Have backup plan** - if issues occur, can reduce to 50 students per session

## Troubleshooting

### All Students Can't Connect
- Check firewall settings (allow port 8080)
- Verify WebSocket support (not blocked by proxy)
- Check server capacity logs

### Slow Performance
- Reduce leaderboard update frequency
- Increase rate limit window
- Check network bandwidth

### Random Disconnections
- Check ping timeout settings
- Verify network stability
- Look for NAT timeout issues

## Server Logs to Monitor

```
✅ Good: "New user connected: abc123 from IP 192.168.1.1 (35 from this IP, 36/100 total)"
✅ Good: "User Student1 joined as student"
⚠️  Warning: "Connection rejected - max capacity reached"
❌ Bad: Multiple disconnects from same IP in short time
```

## Capacity Planning

| Students | Expected Load | Recommendation |
|----------|---------------|----------------|
| 1-35     | Light         | No issues expected |
| 36-70    | Moderate      | Monitor performance |
| 71-100   | Heavy         | Test beforehand, have backup plan |
| 100+     | Very Heavy    | Split into multiple sessions |

## Network Requirements

**Minimum:**
- 1 Mbps upload/download
- <100ms latency
- Stable connection

**Recommended:**
- 5+ Mbps upload/download
- <50ms latency
- Wired connection for server

## Summary

✅ **The system is designed to handle 70-100 students from the same IP address**
✅ **Socket.io handles this scenario natively**
✅ **Monitoring is in place to track connections per IP**
✅ **Optimizations are configured for classroom use**

The main considerations are:
1. Network bandwidth (1-2 Mbps for 100 students)
2. Firewall/proxy configuration (allow WebSocket)
3. Server resources (CPU/memory)

For a typical classroom with 35-70 students, you should have no issues with same-IP connections.