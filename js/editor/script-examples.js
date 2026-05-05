/**
 * ScriptExamples - Col·lecció d'exemples de scripts
 * 
 * Scripts educatius en Python per aprendre IoT-Vertebrae
 * Tots en català amb comentaris explicatius
 */

const ScriptExamples = {
    // Categoria: Bàsics
    basics: [
        {
            id: 'hello-world',
            name: 'Hola Món',
            description: 'Primer programa: mostrar text per consola',
            code: `# My first Python program
print("Hello, world!")
print("Welcome to IoT-Vertebrae")

# I can also do operations
result = 10 + 5
print("10 + 5 =", result)`
        },
        {
            id: 'variables',
            name: 'Variables i tipus',
            description: 'Treballar amb variables i diferents tipus de dades',
            code: `# Variables of different types
name = "IoT-Vertebrae"
version = 2.0
active = True

print("Name:", name)
print("Version:", version)
print("Active:", active)

# Lists
sensors = [1, 2, 3, 4]
print("Sensors:", sensors)`
        },
        {
            id: 'loops',
            name: 'Bucles',
            description: 'Repetir accions amb bucles for i while',
            code: `# For loop
print("Counting to 5:")
for i in range(1, 6):
    print("Number:", i)

print()

# Loop with list
colors = ["red", "green", "blue"]
for color in colors:
    print("Color:", color)`
        }
    ],

    // Categoria: Digital
    digital: [
        {
            id: 'led-blink',
            name: 'LED parpellejant',
            description: 'Encendre i apagar un LED (sortida digital)',
            code: `import iotv
import time

# Configuration
vertebra = "0x0"
rib = "a"
bit = 0

print("LED blinking on bit", bit)
print("Press STOP to stop")

# Infinite loop
for i in range(10):
    # Turn LED ON
    iotv.doutbit(vertebra, rib, bit, 1)
    print("LED ON")
    time.sleep(0.5)
    
    # Turn LED OFF
    iotv.doutbit(vertebra, rib, bit, 0)
    print("LED OFF")
    time.sleep(0.5)

print("Program finished")`
        },
        {
            id: 'sequence',
            name: 'Seqüència de LEDs',
            description: 'Encendre LEDs seqüencialment (efecte Knight Rider)',
            code: `import iotv
import time

vertebra = "0x0"
rib = "a"

print("Sequence of 8 LEDs")
print("Press STOP to stop")

# Repeat 5 times
for cycle in range(5):
    # Forward (0 to 7)
    for bit in range(8):
        iotv.doutbit(vertebra, rib, bit, 1)
        time.sleep(0.1)
        iotv.doutbit(vertebra, rib, bit, 0)
    
    # Backward (7 to 0)
    for bit in range(7, -1, -1):
        iotv.doutbit(vertebra, rib, bit, 1)
        time.sleep(0.1)
        iotv.doutbit(vertebra, rib, bit, 0)

# Turn all OFF
iotv.dout(vertebra, rib, 0x00)
print("Sequence finished")`
        },
        {
            id: 'binary-counter',
            name: 'Comptador binari',
            description: 'Mostrar números en binari (0-255)',
            code: `import iotv
import time

print("Starting binary counter...")

for i in range(256):
    iotv.dout("0x0", "a", i)
    binary = bin(i)[0:].zfill(8)
    print(f"Counter: {i} = {binary}")
    time.sleep(0.1)

# Reset to 0
iotv.dout("0x0", "a", 0)
print("Counter finished!")`
        },
        {
            id: 'button-led',
            name: 'Botó → Freqüència LED',
            description: 'Botó controla la velocitat de parpelleig',
            code: `import iotv
import time

vertebra = "0x0"
input_rib = "b"
output_rib = "a"
bit = 0

print("Button controls LED frequency")
print("Button OFF: fast | Button ON: slow")

for i in range(20):
    # Simulate button reading (alternates every 5)
    button_pressed = 0
    if i >= 10:
        button_pressed = 1
    
    # Determine speed
    if button_pressed:
        delay = 1.0
        print("Button ON -> Slow blink")
    
    if button_pressed == 0:
        delay = 0.2
        print("Button OFF -> Fast blink")
    
    # Blink
    iotv.doutbit(vertebra, output_rib, bit, 1)
    time.sleep(delay / 2)
    iotv.doutbit(vertebra, output_rib, bit, 0)
    time.sleep(delay / 2)

print("Finished")`
        }
    ],

    // Categoria: Analògic
    analog: [
        {
            id: 'read-sensor',
            name: 'Read analog sensor',
            description: 'Llegir un sensor i mostrar el voltatge',
            code: `import iotv
import time

vertebra = "0x0"
rib = "b"
channel = 1

print("Reading sensor on channel", channel)
print("Press STOP to stop")

for i in range(20):
    # Read digital value (0-4095)
    value = iotv.ain(vertebra, rib, channel)
    
    # Convert to voltage (-10V to +10V)
    voltage = iotv.ain2v(value)
    
    print("Reading", i+1, ":", value, "->", voltage, "V")
    
    time.sleep(0.5)

print("Reading finished")`
        },
        {
            id: 'voltage-output',
            name: 'Generate voltage',
            description: 'Generar diferents voltatges de sortida',
            code: `import iotv
import time

vertebra = "0x0"
rib = "a"
channel = 1

print("Generating voltages from 0V to 10V")

# From 0V to 10V in 1V steps
for volts in range(11):
    # Convert voltage to digital value
    value = iotv.v2aout(volts)
    
    # Write output
    iotv.aout(vertebra, rib, channel, value)
    
    print("Output:", volts, "V (digital value:", value, ")")
    
    time.sleep(0.5)

# Reset to 0V
iotv.aout(vertebra, rib, channel, 0)
print("Generation finished")`
        },
        {
            id: 'sine-wave',
            name: 'Sine wave',
            description: 'Generar una ona sinusoidal analògica',
            code: `import iotv
import time
import math

vertebra = "0x0"
rib = "a"
channel = 1

print("Generating sine wave")
print("Amplitude: 5V, Offset: 5V")

# Generate 2 complete cycles
for i in range(40):
    # Calculate angle (0 to 2pi)
    angle = (i / 20) * 2 * math.pi
    
    # Calculate voltage: sin(angle) * 5 + 5
    # Result: oscillates between 0V and 10V
    voltage = math.sin(angle) * 5 + 5
    
    # Convert and write
    value = iotv.v2aout(voltage)
    iotv.aout(vertebra, rib, channel, value)
    
    print("Angle:", angle, "rad | Voltage:", voltage, "V")
    
    time.sleep(0.1)

# Reset
iotv.aout(vertebra, rib, channel, 0)
print("Wave finished")`
        }
    ],

    // Categoria: Avançat
    advanced: [
        {
            id: 'traffic-light',
            name: 'Semàfor',
            description: 'Simular un semàfor amb 3 LEDs',
            code: `import iotv
import time

vertebra = "0x0"
rib = "a"

# Bits for each color
RED = 0
YELLOW = 1
GREEN = 2

def turn_off_all():
    iotv.doutbit(vertebra, rib, RED, 0)
    iotv.doutbit(vertebra, rib, YELLOW, 0)
    iotv.doutbit(vertebra, rib, GREEN, 0)

print("Traffic light: Red=0, Yellow=1, Green=2")
print("Cycles: 3")

for cycle in range(3):
    print(f"\\nCycle {cycle + 1}/3")
    
    # Green (5 seconds)
    turn_off_all()
    iotv.doutbit(vertebra, rib, GREEN, 1)
    print("GREEN - Go")
    time.sleep(2)
    
    # Yellow (2 seconds)
    turn_off_all()
    iotv.doutbit(vertebra, rib, YELLOW, 1)
    print("YELLOW - Caution")
    time.sleep(1)
    
    # Red (5 seconds)
    turn_off_all()
    iotv.doutbit(vertebra, rib, RED, 1)
    print("RED - Stop")
    time.sleep(2)

turn_off_all()
print("\\nTraffic light finished")`
        },
        {
            id: 'pwm-simulation',
            name: 'Efecte fade amb PWM',
            description: 'Efecte fade suau amb PWM real',
            code: `import iotv
import time

# Configure PWM mode
iotv.dsetup("0x0", "aoutpwm", "bin")
print("PWM mode configured")
print("Starting fade effect...")

for cycle in range(3):
    print("Cycle " + str(cycle + 1) + "/3")
    
    # Fade in (0 -> 255)
    for pwm in range(0, 256, 10):
        iotv.doutpwm("0x0", "a", pwm)
        print("  Fade IN - PWM: " + str(pwm) + "/255")
        time.sleep(0.05)
    
    # Fade out (255 -> 0)
    pwm_down = [255, 245, 235, 225, 215, 205, 195, 185, 175, 165, 155, 145, 135, 125, 115, 105, 95, 85, 75, 65, 55, 45, 35, 25, 15, 5, 0]
    for pwm in pwm_down:
        iotv.doutpwm("0x0", "a", pwm)
        print("  Fade OUT - PWM: " + str(pwm) + "/255")
        time.sleep(0.05)

# Return to normal mode
iotv.dsetup("0x0", "aout", "bin")
iotv.dout("0x0", "a", 0)
print("Fade completed!")`
        },
        {
            id: 'thermostat',
            name: 'Simple thermostat',
            description: 'Control on/off segons temperatura',
            code: `import iotv
import time

# Configuration
temp_vertebra = "0x0"
temp_rib = "b"
temp_channel = 1

heater_vertebra = "0x0"
heater_rib = "a"
heater_bit = 0

# Parameters
# 2V = 20C
TEMP_MIN = 2.0
# 2.5V = 25C
TEMP_MAX = 2.5

print("Thermostat: 20-25C")
print("Temp sensor: 0x0.B.1")
print("Heater: 0x0.A.0")

for i in range(20):
    # Read temperature (simulated with voltage)
    value = iotv.ain(temp_vertebra, temp_rib, temp_channel)
    temp_volts = iotv.ain2v(value)
    
    # Check if heating needed
    if temp_volts < TEMP_MIN:
        iotv.doutbit(heater_vertebra, heater_rib, heater_bit, 1)
        print("Temp:", temp_volts, "V -> HEAT ON")
    
    # Check if should turn off
    if temp_volts > TEMP_MAX:
        iotv.doutbit(heater_vertebra, heater_rib, heater_bit, 0)
        print("Temp:", temp_volts, "V -> HEAT OFF")
    
    time.sleep(0.5)

# Turn off
iotv.doutbit(heater_vertebra, heater_rib, heater_bit, 0)
print("Thermostat finished")`
        }
    ],

    // Categoria: Cinta Transportadora
    conveyorBelt: [
        {
            id: 'conveyor-pingpong',
            name: 'Ping-pong with emergency',
            description: 'Control bidireccional entre sensors amb parada d\'emergència',
            code: `import iotv
import time

# Configuration IO
vertebra = "0x0"
# Forward (right)
bMotorA = 4
# Backward (left)
bMotorB = 5
bSolenoide = 6
# Left sensor
bSensorE = 5
# Right sensor
bSensorD = 6
# Emergency button
bEmergencia = 7
# DAC channel 0 (+1 for aout function)
canalVel = 1

print("=== PING-PONG WITH EMERGENCY ===")
print("Press emergency button to stop")
print()

# Set speed 50%
iotv.aout(vertebra, 'a', canalVel, iotv.v2aout(5.0))
print("Speed: 50%")

# Spawn initial box
iotv.doutbit(vertebra, 'a', bSolenoide, 1)
time.sleep(0.1)
iotv.doutbit(vertebra, 'a', bSolenoide, 0)
print("Box unloaded")
time.sleep(1)

# Initial direction: forward (right)
direction = 1

while True:
    # Check emergency
    emergency = iotv.dinbit(vertebra, 'b', bEmergencia)
    if emergency == 1:
        print("WARNING: EMERGENCY ACTIVATED - Motor stopped")
        iotv.doutbit(vertebra, 'a', bMotorA, 0)
        iotv.doutbit(vertebra, 'a', bMotorB, 0)
        time.sleep(0.5)
        continue
    
    # Activate motor based on direction
    if direction == 1:
        iotv.doutbit(vertebra, 'a', bMotorA, 1)
        iotv.doutbit(vertebra, 'a', bMotorB, 0)
        print("-> Motor forward")
    if direction != 1:
        iotv.doutbit(vertebra, 'a', bMotorA, 0)
        iotv.doutbit(vertebra, 'a', bMotorB, 1)
        print("<- Motor backward")
    
    # Wait for sensor detection
    while True:
        # Check emergency continuously
        emergency = iotv.dinbit(vertebra, 'b', bEmergencia)
        if emergency == 1:
            break
        
        sensorE = iotv.dinbit(vertebra, 'b', bSensorE)
        sensorD = iotv.dinbit(vertebra, 'b', bSensorD)
        
        # Check sensor based on direction (nested if, no or)
        detected = 0
        if direction == 1:
            if sensorD == 1:
                detected = 1
        if direction != 1:
            if sensorE == 1:
                detected = 1
        
        if detected == 1:
            if direction == 1:
                sensor_name = "right"
            if direction != 1:
                sensor_name = "left"
            print("Sensor", sensor_name, "detected")
            break
        
        time.sleep(0.05)
    
    # Change direction
    direction = direction * -1
    time.sleep(0.5)

print("Program end")`
        },
        {
            id: 'conveyor-adc-dac',
            name: 'ADC-DAC speed mapping',
            description: 'Control de velocitat mapejant slider ADC a sortida DAC',
            code: `import iotv
import time

# Configuration
vertebra = "0x0"
bMotorA = 4
# Analog input (slider)
channelADC = 1
# Analog output (motor speed)
channelDAC = 1

print("=== SPEED CONTROL ADC -> DAC ===")
print("Move ADC slider to control speed")
print("ADC: -10V to +10V")
print("DAC: 0V (0%) to 10V (100%)")
print()

# Motor forward
iotv.doutbit(vertebra, 'a', bMotorA, 1)
iotv.doutbit(vertebra, 'a', bMotorA + 1, 0)

while True:
    # Read ADC slider (-10V to +10V)
    adc = iotv.ain(vertebra, "b", channelADC)
    voltage_adc = iotv.ain2v(adc)
    
    # Map: -10V->0V, 0V->5V, 10V->10V
    voltage_dac = (voltage_adc + 10) / 2
    
    # Write to DAC
    dac = iotv.v2aout(voltage_dac)
    iotv.aout(vertebra, "a", channelDAC, dac)
    
    # Show conversion
    percentage = (voltage_dac / 10) * 100
    print("ADC:", voltage_adc, "V -> DAC:", voltage_dac, "V (", int(percentage), "%)")
    
    time.sleep(0.2)

print("Program end")`
        },
        {
            id: 'conveyor-spawn',
            name: 'Multiple box unload',
            description: 'Spawn de diverses caixes amb impulsos de solenoide',
            code: `import iotv
import time

# Configuration
vertebra = "0x0"
bMotorA = 4
bMotorB = 5
bSolenoide = 6
channelSpeed = 1

print("=== MULTIPLE BOX UNLOAD ===")
print()

# Set speed 70%
speed = 7.0
iotv.aout(vertebra, 'a', channelSpeed, iotv.v2aout(speed))
print("Speed configured:", speed, "V (70%)")

# Motor forward
iotv.doutbit(vertebra, 'a', bMotorA, 1)
iotv.doutbit(vertebra, 'a', bMotorB, 0)
print("Motor: FORWARD")
print()

# Unload 5 boxes
num_boxes = 5
# seconds between boxes
interval = 1.5

for i in range(1, num_boxes + 1):
    print("Unloading box", i, "/", num_boxes, "...")
    
    # Solenoid pulse (0->1->0)
    iotv.doutbit(vertebra, 'a', bSolenoide, 1)
    time.sleep(0.1)
    iotv.doutbit(vertebra, 'a', bSolenoide, 0)
    
    print("  Box", i, "unloaded")
    
    # Wait before next
    if i < num_boxes:
        time.sleep(interval)

print()
print("All", num_boxes, "boxes unloaded!")
print("Waiting for them to exit conveyor...")
time.sleep(10)

# Stop motor
iotv.doutbit(vertebra, 'a', bMotorA, 0)
print("Motor stopped")
print("Program end")`
        },
        {
            id: 'conveyor-complete',
            name: 'Sistema complet amb seguretat',
            description: 'Exemple integral: spawn, ping-pong, velocitat variable i emergència',
            code: `import iotv
import time

# Configuration IO
vertebra = "0x0"
bMotorA = 4
bMotorB = 5
bSolenoide = 6
bSensorE = 5
bSensorD = 6
bEmergencia = 7
channelSpeed = 1

print("========================================")
print("  COMPLETE CONVEYOR SYSTEM")
print("========================================")
print()
print("Features:")
print("  - Automatic box unload")
print("  - Ping-pong between sensors")
print("  - Progressive speed")
print("  - Emergency stop")
print()
print("Press emergency button to stop")
print("========================================")
print()

# Helper function: check emergency
def emergency_active():
    return iotv.dinbit(vertebra, 'b', bEmergencia)

def stop_motor():
    iotv.doutbit(vertebra, 'a', bMotorA, 0)
    iotv.doutbit(vertebra, 'a', bMotorB, 0)

# Initial speed
speed = 3.0
print(f"Initial speed: {speed}V (30%)")

# Unload 3 boxes
print()
print("PHASE 1: Box unload")

# Activate motor at low speed to separate boxes
spawn_speed = 3.0
iotv.aout(vertebra, 'a', channelSpeed, iotv.v2aout(spawn_speed))
iotv.doutbit(vertebra, 'a', bMotorA, 1)
iotv.doutbit(vertebra, 'a', bMotorB, 0)

for i in range(1, 4):
    if emergency_active() == 1:
        print("WARNING: Emergency - operation cancelled")
        stop_motor()
        return
    
    print(f"  Box {i}/3...")
    
    # Spawn box
    iotv.doutbit(vertebra, 'a', bSolenoide, 1)
    time.sleep(0.1)
    iotv.doutbit(vertebra, 'a', bSolenoide, 0)
    
    # Wait for drop and move a bit to separate
    time.sleep(1.5)

print("  All boxes unloaded")

# Stop motor before ping-pong
stop_motor()
time.sleep(0.5)

# Ping-pong with progressive speed
print()
print("PHASE 2: Ping-pong transport")
direction = 1
cycles = 0
max_cycles = 6

while cycles < max_cycles:
    if emergency_active() == 1:
        print()
        print("WARNING: EMERGENCY ACTIVATED")
        stop_motor()
        print("System stopped. Release emergency to continue.")
        
        # Wait for deactivation
        while emergency_active() == 1:
            time.sleep(0.5)
        
        print("Emergency released. Continuing...")
        time.sleep(1)
        continue
    
    # Increase speed progressively
    speed = min(10.0, 3.0 + (cycles * 1.2))
    dac = iotv.v2aout(speed)
    iotv.aout(vertebra, 'a', channelSpeed, dac)
    
    # Activate motor
    if direction == 1:
        iotv.doutbit(vertebra, 'a', bMotorA, 1)
        iotv.doutbit(vertebra, 'a', bMotorB, 0)
        print(f"  -> Cycle {cycles+1}: Forward ({int(speed/10*100)}%)")
    if direction != 1:
        iotv.doutbit(vertebra, 'a', bMotorA, 0)
        iotv.doutbit(vertebra, 'a', bMotorB, 1)
        print(f"  <- Cycle {cycles+1}: Backward ({int(speed/10*100)}%)")
    
    # Wait for sensor
    while True:
        if emergency_active() == 1:
            break
        
        sE = iotv.dinbit(vertebra, 'b', bSensorE)
        sD = iotv.dinbit(vertebra, 'b', bSensorD)
        
        # Nested if without and/or
        detected = 0
        if direction == 1:
            if sD == 1:
                detected = 1
        if direction != 1:
            if sE == 1:
                detected = 1
        
        if detected == 1:
            print("    Sensor detected")
            break
        
        time.sleep(0.05)
    
    # Change direction
    direction = direction * -1
    cycles = cycles + 1
    time.sleep(0.3)

# End
print()
print("PHASE 3: Completion")
stop_motor()
iotv.aout(vertebra, 'a', channelSpeed, 0)
print("  Motor stopped")
print("  Speed at 0%")
print()
print("========================================")
print("  COMPLETE CYCLE FINISHED")
print("========================================")`
        }
    ],

    // Categoria: Pont H
    pontH: [
        {
            id: 'ponth-basic',
            name: 'Basic motors',
            description: 'Control bàsic dels 2 motors amb temporitzadors',
            code: `import iotv
import time

# Configuration IO
vertebra = "0x0"
# Motor 1 forward
motor1A = 0
# Motor 1 backward
motor1B = 1
# Motor 2 forward
motor2A = 2
# Motor 2 backward
motor2B = 3

print("=== BASIC H-BRIDGE CONTROL ===")
print("2 motors with H-bridge")
print()

# MOTOR 1
print("MOTOR 1: Forward/backward test")
print()

# Forward 3 seconds
print("  -> Motor 1 FORWARD (3s)")
iotv.doutbit(vertebra, 'a', motor1A, 1)
iotv.doutbit(vertebra, 'a', motor1B, 0)
time.sleep(3)

# Backward 3 seconds
print("  <- Motor 1 BACKWARD (3s)")
iotv.doutbit(vertebra, 'a', motor1A, 0)
iotv.doutbit(vertebra, 'a', motor1B, 1)
time.sleep(3)

# Stop
print("  STOP Motor 1 STOPPED")
iotv.doutbit(vertebra, 'a', motor1A, 0)
iotv.doutbit(vertebra, 'a', motor1B, 0)
time.sleep(1)

print()

# MOTOR 2
print("MOTOR 2: Forward/backward test")
print()

# Forward 3 seconds
print("  -> Motor 2 FORWARD (3s)")
iotv.doutbit(vertebra, 'a', motor2A, 1)
iotv.doutbit(vertebra, 'a', motor2B, 0)
time.sleep(3)

# Backward 3 seconds
print("  <- Motor 2 BACKWARD (3s)")
iotv.doutbit(vertebra, 'a', motor2A, 0)
iotv.doutbit(vertebra, 'a', motor2B, 1)
time.sleep(3)

# Stop
print("  STOP Motor 2 STOPPED")
iotv.doutbit(vertebra, 'a', motor2A, 0)
iotv.doutbit(vertebra, 'a', motor2B, 0)

print()
print("Test finished!")`
        },
        {
            id: 'ponth-alternate',
            name: 'Alternating motors',
            description: 'Motors funcionant en sentits oposats de forma alternada',
            code: `import iotv
import time

# Configuration IO
vertebra = "0x0"
# Motor 1 forward
motor1A = 0
# Motor 1 backward
motor1B = 1
# Motor 2 forward
motor2A = 2
# Motor 2 backward
motor2B = 3

print("=== ALTERNATING MOTORS ===")
print("M1 forward while M2 backward")
print("Then reverse directions")
print()

# Number of cycles
cycles = 5
# seconds per cycle
duration = 2

for i in range(1, cycles + 1):
    print("Cycle", i, "/", cycles)
    
    # Phase 1: M1 forward, M2 backward
    print("  M1 -> | M2 <-")
    iotv.doutbit(vertebra, 'a', motor1A, 1)
    iotv.doutbit(vertebra, 'a', motor1B, 0)
    iotv.doutbit(vertebra, 'a', motor2A, 0)
    iotv.doutbit(vertebra, 'a', motor2B, 1)
    time.sleep(duration)
    
    # Phase 2: M1 backward, M2 forward
    print("  M1 <- | M2 ->")
    iotv.doutbit(vertebra, 'a', motor1A, 0)
    iotv.doutbit(vertebra, 'a', motor1B, 1)
    iotv.doutbit(vertebra, 'a', motor2A, 1)
    iotv.doutbit(vertebra, 'a', motor2B, 0)
    time.sleep(duration)
    
    print()

# Stop both motors
print("Stopping motors...")
iotv.doutbit(vertebra, 'a', motor1A, 0)
iotv.doutbit(vertebra, 'a', motor1B, 0)
iotv.doutbit(vertebra, 'a', motor2A, 0)
iotv.doutbit(vertebra, 'a', motor2B, 0)

print("Cycles completed!")`
        }
    ],

    // Categoria: MQTT
    mqtt: [
        {
            id: 'mqtt-publisher',
            name: '📡 MQTT Publisher - Switches',
            description: 'Publicar estat dels switches via MQTT cada 2s',
            code: `# Publish switch state via MQTT
import paho.mqtt.client as mqtt
import time

print("MQTT Publisher - Switch state")
print("Broker: broker.emqx.io:8084")
print("")

# Create MQTT client
client = mqtt.Client("iot-vertebrae-publisher")

# Connection callback
def on_connect(client, userdata, flags, rc):
    if rc == 0:
        print("Connected to MQTT broker")
        print("Publishing to: iot-vertebrae/switches/status")
        print("")
    else:
        print("Connection error")

# Assign callback
client.on_connect = on_connect

# Connect
print("Connecting...")
client.connect("broker.emqx.io", 8084, 60)
client.loop_start()

# Publish switch state
print("Publishing switch state every 2s")
print("(Change switches to see values)")
print("(Press Stop to finish)")
print("")

for i in range(30):
    switches = iotv.din('0x0', 'b')
    value = int(switches, 2)
    client.publish("iot-vertebrae/switches/status", str(value))
    print("Published: " + str(value))
    time.sleep(2)

# Disconnect
client.loop_stop()
client.disconnect()
print("")
print("Disconnected from broker")`
        },
        {
            id: 'mqtt-subscriber',
            name: '📡 MQTT Subscriber - Control LEDs',
            description: 'Subscriure i controlar LEDs via MQTT',
            code: `# Subscribe and control LEDs via MQTT
import paho.mqtt.client as mqtt
import time

print("MQTT Subscriber - LED control")
print("Broker: broker.emqx.io:8084")
print("")

client = mqtt.Client("iot-vertebrae-subscriber")

def on_connect(client, userdata, flags, rc):
    print("Connected to MQTT broker")
    client.subscribe("iot-vertebrae/leds/control")
    print("Subscribed to: iot-vertebrae/leds/control")
    print("")
    print("Waiting for messages...")
    print("Send: ON, OFF, or 0-255")
    print("")
    
    def handle_msg(c, u, msg):
        payload = msg.payload
        print("=== Message received ===")
        print("Payload: " + payload)
        
        if payload == "ON":
            iotv.dout('0x0', 'a', 0xFF)
            print("LEDs: ALL ON")
        
        if payload == "OFF":
            iotv.dout('0x0', 'a', 0x00)
            print("LEDs: ALL OFF")
        
        if payload != "ON":
            if payload != "OFF":
                value = int(payload)
                iotv.dout('0x0', 'a', value)
                print("LEDs value: " + str(value))
    
    client.on_message = handle_msg

client.on_connect = on_connect
client.connect("broker.emqx.io", 8084, 60)
client.loop_start()

print("Listening for MQTT messages...")
print("(Press Stop to finish)")
print("")

for i in range(120):
    time.sleep(1)
    if i % 20 == 0:
        print("Active... " + str(i) + "s")

client.loop_stop()
client.disconnect()
print("")
print("Disconnected from broker")`
        },
        {
            id: 'mqtt-sensor',
            name: '📡 MQTT Sensor - Telemetria',
            description: 'Publicar lectures de sensor via MQTT',
            code: `# Publish sensor readings via MQTT
import paho.mqtt.client as mqtt
import time

print("=== Sensor publishing via MQTT ===")
print("Broker: broker.emqx.io:8084 (WSS)")
print("")

# Create MQTT client
client = mqtt.Client("iot-vertebrae-sensor")

# Connection callback
def on_connect(client, userdata, flags, rc):
    if rc == 0:
        print("Connected to MQTT broker")
        print("")
        print("Publishing readings every 1 second...")
        print("Topics:")
        print("  - iot-vertebrae/sensor/voltage")
        print("  - iot-vertebrae/sensor/temperature")
        print("")
    else:
        print("Connection error, code: " + str(rc))

# Assign callback
client.on_connect = on_connect

# Connect
print("Connecting to broker.emqx.io:8084...")
client.connect("broker.emqx.io", 8084, 60)
client.loop_start()

# Publish readings every second
print("Adjust AI1 slider to change values")
print("(Press Stop to finish)")
print("")

for i in range(60):
    # Read analog sensor
    adc = iotv.ain('0x0', 'b', 1)
    voltage = iotv.ain2v(adc)
    
    # Simulate temperature (-10V..+10V -> 0C..100C)
    temperature = (voltage + 10) * 5
    
    # Publish voltage
    client.publish("iot-vertebrae/sensor/voltage", str(voltage))
    
    # Publish temperature
    client.publish("iot-vertebrae/sensor/temperature", str(temperature))
    
    # Visual indicator with LEDs
    level = int((voltage + 10) / 20 * 8)
    leds = 0
    if level > 0:
        leds = (1 << level) - 1
    iotv.dout('0x0', 'a', leds)
    
    # Show
    reading = i + 1
    print("Reading " + str(reading) + ": " + str(voltage) + "V / " + str(temperature) + "C")
    
    time.sleep(1)

# Cleanup
client.loop_stop()
client.disconnect()
iotv.dout('0x0', 'a', 0)
print("")
print("Disconnected from broker")`
        }
    ],

    /**
     * Obtenir tots els exemples
     */
    getAll() {
        return [
            ...this.basics,
            ...this.digital,
            ...this.analog,
            ...this.advanced,
            ...this.conveyorBelt,
            ...this.pontH,
            ...this.mqtt
        ];
    },

    /**
     * Obtenir exemple per ID
     */
    getById(id) {
        return this.getAll().find(ex => ex.id === id);
    },

    /**
     * Obtenir exemples per categoria
     */
    getByCategory(category) {
        return this[category] || [];
    },

    /**
     * Obtenir categories
     */
    getCategories() {
        return [
            { id: 'basics', name: 'Bàsics', icon: '📚' },
            { id: 'digital', name: 'Digital', icon: '💡' },
            { id: 'analog', name: 'Analògic', icon: '📊' },
            { id: 'advanced', name: 'Avançat', icon: '🚀' },
            { id: 'conveyorBelt', name: 'Cinta Transportadora', icon: '📦' },
            { id: 'pontH', name: 'Pont H', icon: '⚙️' },
            { id: 'mqtt', name: 'MQTT', icon: '📡' }
        ];
    }
};

// Exportar globalment
if (typeof window !== 'undefined') {
    window.ScriptExamples = ScriptExamples;
}

console.log('✓ ScriptExamples loaded');
