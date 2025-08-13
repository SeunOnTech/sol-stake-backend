# Solana Validator Scoring System - Bit 5

This document describes the implementation of Bit 5: **Scoring for all validators (scale to N)**.

## Overview

The scoring system calculates trust scores for all validators in the database using the v1 formula:
```
score = uptime - (commission ?? 5)
```

Where:
- `uptime`: Validator uptime percentage (0-100)
- `commission`: Validator commission percentage (can be null)
- `baselinePenalty`: 5% penalty when commission is null/undefined
- `score`: Clamped between 0 and 100

## Architecture

### Components

1. **`scoringAllValidators.ts`** - Main scoring worker that processes all validators
2. **`testScoring.ts`** - Test script to verify scoring functionality
3. **Database Models**:
   - `Validator` - Stores validator information
   - `TrustScore` - Stores individual scores with timestamps
   - `ScoringRun` - Groups scores by scoring session

### Key Features

- ✅ **Scales to N validators** - Processes validators in configurable batches
- ✅ **Idempotent** - Each run creates new scores with unique run IDs
- ✅ **Performance optimized** - Concurrent batch processing with rate limiting
- ✅ **Comprehensive logging** - Detailed progress and error reporting
- ✅ **Audit trail** - Failed jobs logged to audit log
- ✅ **History preservation** - All scoring runs and scores are preserved

## Usage

### 1. Run Scoring for All Validators

```bash
npm run score:all
```

This will:
- Read all validators from the database
- Create a new `ScoringRun` record
- Calculate trust scores using the v1 formula
- Save all `TrustScore` records with the run ID
- Provide detailed logging and progress updates

### 2. Test the Scoring System

```bash
npm run test:scoring
```

This will:
- Verify validators exist in the database
- Run the scoring job
- Display sample results
- Show verification metrics

### 3. Manual Testing

```bash
# First, ensure you have validators in the database
npm run fetch:once

# Then run scoring
npm run score:all

# Check results in Prisma Studio
npx prisma studio
```

## Verification

### Database Verification

After running the scoring job, verify in Prisma Studio:

1. **ScoringRun table**: Should show a new record with current timestamp
2. **TrustScore table**: Should show approximately N new records (one per validator)
3. **Consistency**: All new TrustScore records should reference the same `scoringRunId`

### Expected Results

- **TrustScore count ≈ validator count** (one score per validator per run)
- **All scores reference the same scoringRunId** for consistency
- **Scores are bounded** between 0 and 100
- **Formula applied correctly**: `uptime - (commission ?? 5)`

## Performance Characteristics

- **Batch processing**: 50 validators per batch by default
- **Concurrent execution**: Each batch processed concurrently
- **Rate limiting**: 100ms delay between batches to prevent DB overload
- **Scalability**: Designed to handle thousands of validators efficiently

## Error Handling

- **Individual failures**: Failed validator scores are logged but don't stop the job
- **Critical failures**: Job stops and logs to audit log
- **Retry logic**: Built-in retry mechanisms for transient failures
- **Comprehensive logging**: Detailed error context for debugging

## Monitoring

### Logs to Watch

- 🚀 Job start and completion
- 📊 Validator count and batch progress
- ✅ Success counts and progress updates
- ❌ Error details for failed validators
- 🎯 Final results and verification metrics

### Key Metrics

- Total validators processed
- Success/failure counts
- Processing duration
- Scoring run ID for reference

## Troubleshooting

### Common Issues

1. **No validators found**: Run `npm run fetch:once` first
2. **Database connection errors**: Check DATABASE_URL environment variable
3. **Permission errors**: Ensure database user has write access
4. **Memory issues**: Reduce batch size for very large validator sets

### Debug Commands

```bash
# Check validator count
npx prisma studio

# View recent scoring runs
npx prisma studio --port 5556

# Check trust scores
npx prisma studio --port 5557
```

## Future Enhancements

- **Real-time scoring**: WebSocket updates during scoring
- **Advanced formulas**: Multiple scoring algorithms
- **Performance metrics**: Historical scoring performance tracking
- **Scheduled scoring**: Automated periodic scoring runs
- **Score analytics**: Trend analysis and insights

## API Integration

The scoring system integrates with the GraphQL API:

- **Query validators**: Get all validators with their latest scores
- **Historical scores**: Access scoring history through TrustScore relationships
- **Scoring runs**: Track when scoring was performed

## Conclusion

This implementation successfully achieves all Bit 5 requirements:
- ✅ Scales to N validators efficiently
- ✅ Applies consistent v1 scoring formula
- ✅ Maintains proper run metadata and relationships
- ✅ Ensures idempotency and history preservation
- ✅ Provides comprehensive verification and monitoring

The system is production-ready and can handle real-world validator sets with thousands of validators.
