#!/bin/bash
# Fix empty catch blocks by adding error parameter

find src -name "*.ts" -type f | while read file; do
    # Replace } catch { with } catch (error: unknown) {
    sed -i '' 's/} catch {/} catch (error: unknown) {/g' "$file"
done

echo "Fixed catch blocks in all TypeScript files"
