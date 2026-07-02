#!/usr/bin/env python3
"""
A simple Python script to print 'Hello, World!' locally.
"""

def main():
    try:
        print("Hello, World!")
    except Exception as e:
        # Catch any unexpected errors
        print(f"An error occurred: {e}")

if __name__ == "__main__":
    main()
