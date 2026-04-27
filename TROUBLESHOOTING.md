# Investment Game - Troubleshooting Guide

## Common Issues and Solutions

### Issue 1: Multiple Instructor Logins

**Problem**: Two instructors logged in simultaneously, causing mismatched leaderboards.

**Solution**: 
- The system now enforces **single instructor sessions**
- Only one active instructor can be connected at a time
- If an instructor disconnects, their session is preserved for 5 minutes for reconnection
- Use the same browser/device to reconnect and recover your session

**How to Recover**:
1. If you accidentally opened a second instructor window, close it
2. Refresh the original instructor window
3. Log in again with the password - your data will be restored

### Issue 2: Investment Amounts Not Showing

**Problem**: Students' investments weren't visible on the instructor screen.

**Solution**:
- The leaderboard now updates more reliably
- Student investment totals are now shown in the Active Students panel
- Each student card shows both "Invested" and "Remaining" amounts

**What to Check**:
- Ensure students are in "Voting" phase (instructor must click "Start Voting")
- Check the Active Students panel - it now shows total invested per student
- The leaderboard updates every 2 seconds during voting

### Issue 3: Instructor Screen Freezing

**Problem**: The instructor interface became unresponsive with 35 students.

**Causes**:
- Too many simultaneous updates
- Browser memory issues
- Network congestion

**Solutions Implemented**:
- Debounced leaderboard updates (max once per 2 seconds)
- Rate limiting on student actions (1 action per second)
- Optimized data transmission
- Connection limit set to 70 users maximum

**If Screen Freezes**:
1. Don't close the browser immediately
2. Wait 5-10 seconds for updates to process
3. If still frozen, refresh the page
4. Log back in - your session will be recovered

### Issue 4: Excel Upload Lost After Reconnection

**Problem**: After logging in as a new instructor, the Excel data was gone.

**Solution**:
- Instructor sessions now persist for 5 minutes after disconnect
- Excel data is saved to the session
- Reconnecting within 5 minutes restores all data

**Best Practices**:
1. Upload Excel file BEFORE starting voting
2. Keep the instructor browser tab open during class
3. If you must refresh, do so within 5 minutes
4. Consider keeping a backup of your Excel file

## Pre-Class Checklist

### For Instructors:
- [ ] Upload Excel file with company data
- [ ] Verify all companies appear in the list
- [ ] Test with 2-3 students before class starts
- [ ] Keep instructor browser tab open throughout class
- [ ] Have backup Excel file ready

### During Class:
- [ ] Wait for all students to connect before starting voting
- [ ] Monitor the Active Students panel for connection issues
- [ ] Watch for the total invested amount to track participation
- [ ] Don't refresh browser unless absolutely necessary

### After Voting:
- [ ] Click "End Voting" to move to Results phase
- [ ] Export Excel report immediately
- [ ] Save the exported file before resetting

## Technical Specifications

### System Limits:
- **Maximum Connections**: 70 users (1 instructor + 69 students)
- **Rate Limiting**: 1 action per second per user
- **Leaderboard Updates**: Every 2 seconds during voting
- **Session Timeout**: 5 minutes for instructor reconnection

### Browser Requirements:
- Modern browser (Chrome, Firefox, Safari, Edge)
- JavaScript enabled
- Stable internet connection
- Minimum 2GB RAM recommended for instructor

## Emergency Procedures

### If Students Can't Connect:
1. Check if 70-user limit is reached
2. Ask some students to refresh their browsers
3. Verify server is running (check URL)
4. Check network connectivity

### If Leaderboard Stops Updating:
1. Wait 5 seconds (debounce delay)
2. Check browser console for errors (F12)
3. Verify students are in "Voting" phase
4. Refresh instructor browser if needed

### If Data is Lost:
1. Check if within 5-minute recovery window
2. Log back in immediately to recover session
3. If beyond 5 minutes, re-upload Excel file
4. Students' investments are preserved in their browsers

## Support Information

### Logs to Check:
- Browser Console (F12 → Console tab)
- Network tab for connection issues
- Server logs if you have access

### Information to Provide When Reporting Issues:
1. Number of students connected
2. Current phase (Setup/Voting/Results)
3. Browser and version
4. Error messages from console
5. Steps to reproduce the issue

## Best Practices for Large Classes (30+ students)

1. **Stagger Student Logins**: Have students join in groups of 10-15
2. **Monitor Connection Count**: Watch the Active Students panel
3. **Avoid Rapid Phase Changes**: Wait 5 seconds between phase transitions
4. **Use Wired Connection**: Instructor should use ethernet if possible
5. **Close Unnecessary Tabs**: Keep only the game tab open
6. **Export Data Frequently**: Download Excel report after each session

## Version Information

**Current Version**: 2.0 (Multi-Instructor Fix)
**Last Updated**: 2026-04-27

### Recent Changes:
- ✅ Single instructor session enforcement
- ✅ Session recovery for instructors
- ✅ Investment amount visibility improvements
- ✅ Enhanced Active Students panel
- ✅ Debounced leaderboard updates
- ✅ Rate limiting for stability